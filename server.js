const fs = require('fs');
const path = require('path');
const utils = require('util');
const puppeteer = require('puppeteer');
const hb = require('handlebars');
const readFile = utils.promisify(fs.readFile);
const express = require('express');
const app = express();

app.get('/',function(req,res){
    res.send("invoice-pdf-generator by Alledo Technologies Ai");
});


async function getTemplateHtml() {
    console.log("Loading template file in memory");
    try {
        const invoicePath = path.resolve("./invoice.html");
        return await readFile(invoicePath, 'utf8');
    } catch (err) {
        return Promise.reject("Could not load html template");
    }
}


app.get('/invoice', async function (req, res, next) {
    const { name, phone, date, paymentid, paymentmode, paymenttype, servicename, amount, receiptno, download, filename } = req.query;

    let checker = 0;
    let data = {};

    getTemplateHtml().then(async (res) => {
        // Now we have the html code of our template in res object
        // you can check by logging it on console
        console.log("Compiing the template with handlebars")
        const template = hb.compile(res, { strict: true });
        // we have compile our code with handlebars
        const result = template(data);
        // We can use this to add dyamic data to our handlebas template at run time from database or API as per need. you can read the official doc to learn more https://handlebarsjs.com/
        let html = result;

        html = html.split("Name of Customer").join(name);
        html = html.split("Phone of Customer").join(phone);
        html = html.split("Dated On").join(date);
        html = html.split("paymentid").join(paymentid);
        html = html.split("Payment Mode").join(paymentmode);
        html = html.split("visa").join(paymenttype);
        html = html.split("Service Name").join(servicename);
        html = html.split("Service Amount").join(amount);
        html = html.split("Total Amount").join(amount);
        html = html.split("receiptno").join(receiptno);

        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            ignoreDefaultArgs: ['--disable-extensions']
        });

        const page = await browser.newPage();
        // We set the page content as the generated html by handlebars
        await page.setContent(html);
        // We use pdf function to generate the pdf in the same folder as this file.
        await page.pdf({ path: 'invoice.pdf', format: 'A4' });
        await browser.close();

        console.log("PDF Generated");
        checker = 1;
    }).catch(err => {
        console.error(err);
    });

    const timer = setInterval(() => {
        if (checker === 1) {
            clearInterval(timer);
            let img = __dirname + "/invoice.pdf";
            fs.access(img, fs.constants.F_OK, err => {
                //check that we can access  the file
                console.log(`${img} ${err ? "does not exist" : "exists"}`)
            });
            fs.readFile(img, function (err, content) {
                if (err) {
                    res.writeHead(404, {
                        "Content-type": "text/html"
                    });
                    res.end("<h1>No Invoice Found</h1>");
                } else {
                    res.status(200);
                    res.contentType("application/pdf");
                    if (download == "true") {
                        res.setHeader("Content-Disposition", "attachment;filename=" + filename);
                    }
                    res.end(content);
                }
            });
        }
    }, 1);
});


app.get("/invoice/print", (req, res) => {
    const { host } = req.query;

    return res.status(200).send(`
        <body>
            <iframe></iframe>
        </body>
        <style>
            body {
                margin: 0px;
                padding: 0px;
            }
            iframe {
                width: 100%;
                height: 100vh;
                border: 0px;
            }
        </style>
        <script>
            document.querySelector("iframe").src = "https://` + host + req.originalUrl.split("/print").join("") + `";
            document.querySelector("iframe").addEventListener("load", function () {
                document.querySelector("iframe").contentWindow.print();
            });
        </script>
    `);
});

app.listen(8080, () => {
    console.log("pdf-plus-railway running on PORT 8080");
});