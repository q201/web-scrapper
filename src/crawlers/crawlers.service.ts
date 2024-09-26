/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { CheerioCrawler } from '@crawlee/cheerio';
import * as fs from 'fs';
import * as path from 'path';
import * as csvWriter from 'csv-write-stream';


@Injectable()
export class CrawlersService {
  async scrapeData(): Promise<void> {
    // CSV Writer Setup
    const writer = csvWriter({
      headers: ['Name(s)', 'Email', 'Registration Number', 'Title', 'Description', 'Copyright Claimant', 'Date Of Creation', 'Rights And Permission', 'Photographs']
    });
    const filePath = path.join(__dirname, 'data.csv');
    const writeStream = fs.createWriteStream(filePath);
    writer.pipe(writeStream);

    // Generate URLs with v1 ranging from 1 to 100
    const urls = Array.from({ length: 10 }, (_, i) =>
      `https://cocatalog.loc.gov/cgi-bin/Pwebrecon.cgi?v1=${i + 1}&ti=1,1&Search_Arg=Group%20registration%20for%20a%20group%20of%20unpublished%20images&Search_Code=FT%2A&CNT=100&PID=dummypid&SEQ=12345678912345&SID=0`
    );

    // Initialize a CheerioCrawler instance with concurrency set to 5
    const crawler = new CheerioCrawler({
      async requestHandler({ request, $, log, crawler }) {
        try {
          // Scraping logic (same as before)
          const name = $('th:contains("Name")').next('td').text().trim() || 'N/A';
          
          const rightsAndPermissionsHtml = $('th:contains("Rights and Permissions")').next('td').html();
          let email = 'N/A';
          const rightsAndPermissions = $('th:contains("Rights and Permissions")').next('td').text().trim() || 'N/A';

          const emailMatch = rightsAndPermissionsHtml.match(/data-cfemail="([^"]+)"/);
          if (emailMatch && emailMatch[1]) {
            email = decodeEmail(emailMatch[1]);
          } else {
            const plainEmailMatch = rightsAndPermissionsHtml.match(/<a[^>]+>(.*?)<\/a>/);
            if (plainEmailMatch) {
              email = plainEmailMatch[1].replace(/&#xa0;/g, '').trim();
            }
          }

          const registrationNumber = $('th:contains("Registration Number")').next('td').text().trim() || 'N/A';
          const title = $('th').filter(function () {
            return $(this).text().trim() === "Title:";
          }).next('td').text().trim() || 'N/A';
          const description = $('th:contains("Description")').next('td').text().trim() || 'N/A';
          const copyrightClaimant = $('th:contains("Copyright Claimant")').next('td').text().trim() || 'N/A';
          const dateOfCreation = $('th:contains("Date of Creation")').next('td').text().trim() || 'N/A';

          const photographs = $('th:contains("Photographs")')
            .parent() // Select the parent <tr> of the <th>
            .nextAll() // Select all subsequent <tr> elements
            .find('td:contains("photographs")') // Find <td> elements that contain the word "photographs"
            .map((i, el) => $(el).text().trim()) // Extract the text of each <td>, trimming whitespace
            .get() // Get an array of texts
            .join(', ') || $('th:contains("Photographs")')
              .next('td') // Select the immediate <td> that follows the <th>
              .text().trim() || 'N/A';

          // Log the extracted data
          log.info(`Extracted Data:
            Name(s): ${name}
            Email: ${email}
            Registration Number: ${registrationNumber}
            Title: ${title}
            Description: ${description}
            Copyright Claimant: ${copyrightClaimant}
            Date Of Creation: ${dateOfCreation}
            Rights And Permission: ${rightsAndPermissions}
            Photographs: ${photographs}
          `);

          // Write the data to the CSV file
          writer.write({
            'Name(s)': name,
            'Email': email,
            'Registration Number': registrationNumber,
            'Title': title,
            'Description': description,
            'Copyright Claimant': copyrightClaimant,
            'Date Of Creation': dateOfCreation,
            'Rights And Permission': rightsAndPermissions,
            'Photographs': photographs,
          });

        } catch (error) {
          if (error.response && error.response.statusCode === 429) {
            // If rate-limited (429), retry with exponential backoff
            const delay = Math.pow(2, request.retryCount || 1) * 2000; // Exponential backoff
            console.log(`Rate-limited: Retrying ${request.url} in ${delay}ms`);

            await new Promise((resolve) => setTimeout(resolve, delay));

            // Re-add the request to the queue for retrying
            await crawler.addRequests([request]);
          } else {
            throw error;
          }
        }
      },

      maxRequestRetries: 5, // Retry up to 5 times
      maxConcurrency: 1, // Limit concurrency to avoid overwhelming the server
      requestHandlerTimeoutSecs : 120, // Handle pages with a higher timeout in case of slow loading
      failedRequestHandler: ({ request }) => {
        console.error(`Request failed after all retries: ${request.url}`);
      },
    });

    // Run the crawler for the generated URLs
    await crawler.run(urls);

    // Close the CSV writer once scraping is complete
    writer.end(() => {
      console.log(`Scraping completed and data saved to ${filePath}`);
    });
  }
}

// Function to decode the email
function decodeEmail(encoded) {
  const r = parseInt(encoded.substr(0, 2), 16);
  return encoded.substr(2).replace(/[0-9a-f]{2}/g, (c) => String.fromCharCode(parseInt(c, 16) ^ r));
}
