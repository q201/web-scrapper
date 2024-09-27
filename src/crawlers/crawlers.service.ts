/* eslint-disable prettier/prettier */

// import { Injectable } from '@nestjs/common';

// import { CheerioCrawler } from '@crawlee/cheerio';

// import { ProxyConfiguration } from '@crawlee/core'; // Import Proxy Configuration

// import * as fs from 'fs';

// import * as path from 'path';

// import * as csvWriter from 'csv-write-stream';

// import axios from 'axios';

// import { HttpsProxyAgent } from 'https-proxy-agent';



// @Injectable()

// export class CrawlersService {

//   private readonly proxyUrls:  string[] = [

//     'http://103.153.154.6:80',

//     'http://185.136.195.203:5678',

//     'http://198.12.85.213:80',

//     'http://203.189.150.48:8080',

//     'http://42.200.124.211:8080',

//     // Add more proxies as needed...

//   ];



//   private currentProxyIndex = 0;



//   private getNextProxy(): string {

//     const proxy = this.proxyUrls[this.currentProxyIndex];

//     this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxyUrls.length;

//     return proxy;

//   }



//   async testProxy(proxyUrl: string): Promise<{ proxyUrl: string; time: number } | null> {

//     const startTime = Date.now();

//     try {

//       // Configure the proxy agent

//       const agent = new HttpsProxyAgent(proxyUrl);

//       const response = await axios.get('https://httpbin.org/ip', { httpAgent: agent });

//       const elapsedTime = Date.now() - startTime;

//       console.log(`Proxy ${proxyUrl} responded in ${elapsedTime}ms. IP:`, response.data.origin);

//       return { proxyUrl, time: elapsedTime };

//     } catch (error) {

//       console.log(`Proxy ${proxyUrl} failed:`, error.message);

//       return null;

//     }

//   }



//   async checkProxies(): Promise<{ proxyUrl: string; time: number }[]> {

//     const results: { proxyUrl: string; time: number }[] = [];

    

//     for (const proxyUrl of this.proxyUrls) {

//       const result = await this.testProxy(proxyUrl);

//       if (result !== null) {

//         results.push(result);

//       }

//     }



//     // Sort proxies by response time (fastest first)

//     const sortedResults = results.sort((a, b) => a.time - b.time);

//     console.log('Fastest Proxies:', sortedResults);

    

//     return sortedResults;

//   }



//   async scrapeData(): Promise<void> {

//     // CSV Writer Setup

//     const writer = csvWriter({ headers: ['Name(s)', 'Email', 'Registration Number', 'Title', 'Description', 'Copyright Claimant', 'Date Of Creation', 'Rights And Permission', 'Photographs'] });

//     const filePath = path.join(__dirname, 'data.csv');

//     const writeStream = fs.createWriteStream(filePath);

//     writer.pipe(writeStream);



//     // Proxy configuration setup

//     const proxyConfiguration = new ProxyConfiguration({

//       proxyUrls: this.proxyUrls,

//     });



//     // Generate URLs for scraping

//     const urls = [

//       `https://cocatalog.loc.gov/cgi-bin/Pwebrecon.cgi?v1=1&ti=1,1&Search%5FArg=Group%20registration%20for%20a%20group%20of%20unpublished%20images&Search%5FCode=FT%2A&CNT=25&PID=hc1aZkMXtkH51M8tix9u6t4qe&SEQ=20240925234034&SID=1`

//     ];



//     // Initialize a CheerioCrawler instance with concurrency set to 2

//     const crawler = new CheerioCrawler({

//       proxyConfiguration, // Add the proxy configuration to enable proxy rotation

//       async requestHandler({ request, $, log }) {

//         const proxyUrl = this.getNextProxy(); // Use the next proxy

//         log.info(`Using Proxy: ${proxyUrl}`);



//         console.log("Scraping: ", request.url);



//         // Use refined selectors to extract the required data

//         const name = $('th:contains("Name")').next('td').text().trim() || 'N/A';

        

//         const rightsAndPermissionsHtml = $('th:contains("Rights and Permissions")').next('td').html();

//         let email = 'N/A';

//         const rightsAndPermissions = $('th:contains("Rights and Permissions")').next('td').text().trim() || 'N/A';



//         const emailMatch = rightsAndPermissionsHtml.match(/data-cfemail="([^"]+)"/);

//         if (emailMatch && emailMatch[1]) {

//             email = this.decodeEmail(emailMatch[1]);

//         } else {

//             const plainEmailMatch = rightsAndPermissionsHtml.match(/<a[^>]+>(.*?)<\/a>/);

//             if (plainEmailMatch) {

//                 email = plainEmailMatch[1].replace(/&#xa0;/g, '').trim();

//             }

//         }



//         const registrationNumber = $('th:contains("Registration Number")').next('td').text().trim() || 'N/A';

//         const title = $('th').filter(function() {

//           return $(this).text().trim() === "Title:";

//         }).next('td').text().trim() || 'N/A';

//         const description = $('th:contains("Description")').next('td').text().trim() || 'N/A';

//         const copyrightClaimant = $('th:contains("Copyright Claimant")').next('td').text().trim() || 'N/A';

//         const dateOfCreation = $('th:contains("Date of Creation")').next('td').text().trim() || 'N/A';

//         const photographs = $('th:contains("Photographs")').parent().nextAll()

//           .find('td:contains("photographs")').map((i, el) => $(el).text().trim()).get().join(', ') 

//           || $('th:contains("Photographs")').next('td').text().trim() || 'N/A';



//         log.info(`Extracted Data:

//           Name(s): ${name}

//           Email: ${email}

//           Registration Number: ${registrationNumber}

//           Title: ${title}

//           Description: ${description}

//           Copyright Claimant: ${copyrightClaimant}

//           Date Of Creation: ${dateOfCreation}

//           Rights And Permission: ${rightsAndPermissions}

//           Photographs: ${photographs}

//         `);



//         // Write the data to the CSV file

//         writer.write({

//           'Name(s)': name,

//           'Email': email,

//           'Registration Number': registrationNumber,

//           'Title': title,

//           'Description': description,

//           'Copyright Claimant': copyrightClaimant,

//           'Date Of Creation': dateOfCreation,

//           'Rights And Permission': rightsAndPermissions,

//           'Photographs': photographs,

//         });

//       },



//       maxRequestRetries: 3,

//       requestHandlerTimeoutSecs: 60,

//       maxConcurrency: 2, // Adjust this based on your needs

//       failedRequestHandler: async ({ request }) => {

//         console.error(`Request failed after all retries: ${request.url}`);

//         // Rotate to the next proxy manually after a failure

//         proxyConfiguration.proxyUrls.push(this.getNextProxy()); // Rotate proxies on failure

//       },

//     });



//     // Run the crawler for the generated URLs

//     await crawler.run(urls);



//     // Close the CSV writer once scraping is complete

//     writer.end(() => {

//       console.log(`Scraping completed and data saved to ${filePath}`);

//     });

//   }



//   // Function to decode the email (replace this with your decoding logic if needed)

//   private decodeEmail(encoded: string): string {

//     const r = parseInt(encoded.substr(0, 2), 16);

//     return encoded.substr(2).replace(/[0-9a-f]{2}/g, (c) => String.fromCharCode(parseInt(c, 16) ^ r));

//   }

// }





/* eslint-disable prettier/prettier */

import { Injectable } from '@nestjs/common';

import { CheerioCrawler } from '@crawlee/cheerio';

import { ProxyConfiguration } from '@crawlee/core'; // Import Proxy Configuration

import * as fs from 'fs';

import * as path from 'path';

import * as csvWriter from 'csv-write-stream';





@Injectable()

export class CrawlersService {

  private proxyUrls: string[] = [

    'http://103.153.154.6:80',

    'http://185.136.195.203:5678',

    'http://198.12.85.213:80',

    'http://203.189.150.48:8080',

    'http://42.200.124.211:8080',

    // Add more proxies as needed...

    'http://143.42.194.37:3128',

  ];

  private currentProxyIndex = 0; // To keep track of the current proxy index



  private getNextProxy(): string {

    const proxy = this.proxyUrls[this.currentProxyIndex];

    this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxyUrls.length; // Rotate to the next proxy

    return proxy;

  }



  async scrapeData(): Promise<void> {

    // CSV Writer Setup

    const writer = csvWriter({ headers: ['Name(s)', 'Email', 'Registration Number', 'Title', 'Description', 'Copyright Claimant', 'Date Of Creation', 'Rights And Permission', 'Photographs'] });

    const filePath = path.join(__dirname, 'data.csv');

    const writeStream = fs.createWriteStream(filePath);

    writer.pipe(writeStream);



    // Initialize a CheerioCrawler instance with concurrency set to 2

    const crawler = new CheerioCrawler({

      proxyConfiguration: new ProxyConfiguration({ proxyUrls: [this.getNextProxy()] }), // Initial proxy configuration with the first proxy

      async requestHandler({ request, $, log }) {

        console.log("Scraping: ", request.url);



        // Use refined selectors to extract the required data

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

        const title = $('th').filter(function() {

          return $(this).text().trim() === "Title:";

        }).next('td').text().trim() || 'N/A';

        const description = $('th:contains("Description")').next('td').text().trim() || 'N/A';

        const copyrightClaimant = $('th:contains("Copyright Claimant")').next('td').text().trim() || 'N/A';

        const dateOfCreation = $('th:contains("Date of Creation")').next('td').text().trim() || 'N/A';

        const photographs = $('th:contains("Photographs")').parent().nextAll()

          .find('td:contains("photographs")').map((i, el) => $(el).text().trim()).get().join(', ') 

          || $('th:contains("Photographs")').next('td').text().trim() || 'N/A';



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

      },



      maxRequestRetries: 3,

      requestHandlerTimeoutSecs: 60,

      maxConcurrency: 2, // Adjust this based on your needs

      failedRequestHandler: async ({ request }) => {

        console.error(`Request failed after all retries: ${request.url}`);

        // Rotate to the next proxy manually after a failure

        const newProxyUrl = this.getNextProxy();

        console.log(`Using new proxy: ${newProxyUrl}`);



        // Create a new proxy configuration with the next proxy

        const newProxyConfiguration = new ProxyConfiguration({

          proxyUrls: [newProxyUrl], // Use only the new proxy

        });

        // Create a new request with the new proxy

    const newRequest = {

      ...request,

      proxyUrl: newProxyUrl, // Set the new proxy URL here

  };



  // Re-add the new request back to the queue

         await crawler.addRequests([newRequest]);

        //crawler.setProxyConfiguration(newProxyConfiguration); // Set the new proxy configuration

      },

    });



    // Generate URLs (assuming you have URLs to scrape)

    const urls = [

      `https://cocatalog.loc.gov/cgi-bin/Pwebrecon.cgi?v1=1&ti=1,1&Search_Arg=Group%20registration%20for%20a%20group%20of%20unpublished%20images&Search_Code=FT%2A&CNT=25&PID=hc1aZkMXtkH51M8tix9u6t4qe&SEQ=20240925234034&SID=1`

    ];



    // Run the crawler for the generated URLs

    await crawler.run(urls);



    // Close the CSV writer once scraping is complete

    writer.end(() => {

      console.log(`Scraping completed and data saved to ${filePath}`);

    });

  }

}



// Function to decode the email (replace this with your decoding logic if needed)

function decodeEmail(encoded) {

  const r = parseInt(encoded.substr(0, 2), 16);

  return encoded.substr(2).replace(/[0-9a-f]{2}/g, (c) => String.fromCharCode(parseInt(c, 16) ^ r));

} 