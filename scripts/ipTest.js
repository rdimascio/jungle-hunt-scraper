'use strict';

const puppeteer = require('puppeteer');
const exec = require('child_process').exec;

(async () => {
	const browser = await puppeteer.launch({
		args: ['--proxy-server=socks5://127.0.0.1:9050'],
	});
	const page = await browser.newPage();

	try {
		// page.on('response', (response) => {
		// 	// Ignore requests that aren't the one we are explicitly doing
		// 	if (response.request().url() === url) {
		// 		if (response.status() > 399) {
		// 			console.log(
		// 				'response.status',
		// 				response.status(),
		// 				response.request().url()
		// 			);
		// 			exec(
		// 				'(echo authenticate \'""\'; echo signal newnym; echo quit) | nc localhost 9051',
		// 				(error, stdout, stderr) => {
		// 					if (stdout.match(/250/g).length === 3) {
		// 						console.log(
		// 							'Success: The IP Address has been changed.'
		// 						);
		// 					} else {
		// 						console.log(
		// 							'Error: A problem occured while attempting to change the IP Address.'
		// 						);
		// 					}
		// 				}
		// 			);
		// 		} else {
		// 			console.log(
		// 				'Success: The Page Response was successful (no need to change the IP Address).'
		// 			);
		// 		}
		// 	}
		// });

		await page.goto('http://checkip.amazonaws.com/');

		const IP = await page.evaluate(() => document.body.textContent.trim());

		console.log(IP);
	} catch (error) {
		console.log('bruh');
	} finally {
		await browser.close();
	}
})();
