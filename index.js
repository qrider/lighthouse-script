const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const splitEasy = require("csv-split-easy");
const fs = require("fs");
const path = require("path");

const mobileConfig = require("./config/mobile");
const desktopConfig = require("./config/desktop");

const csvInputFilename = './data/top5-urls.csv';
const csvDesktopOutputFilename = './data/desktop-output.csv';
const csvMobileOutputFilename = './data/mobile-output.csv';
const newLine= "\r\n";
const headerMap = {
    performanceScore : 'Performance Score',
    accessibilityScore : 'Accessibility Score',
    bestPracticesScore : 'Best Practices Score',
    seoScore : 'SEO Score',
    speedIndexScore : 'Speed Index Score',
    speedIndexValue : 'Speed Index Value',
    totalByteWeightScore : 'Total Byte Weight Score',
    totalByteWeightValue : 'Total Byte Weight Value',
    firstContentfulPaintScore : 'First Contentful Paint Score',
    firstContentfulPaintValue : 'First Contentful Paint Value',
    interactiveScore : 'Interactive Score',
    interactiveValue : 'Interactive Value'
};

const csvFile = fs.readFileSync(
    path.join(__dirname, csvInputFilename),
    'utf8'
);

var desktopLogger = fs.createWriteStream(path.join(__dirname, csvDesktopOutputFilename));
var mobileLogger = fs.createWriteStream(path.join(__dirname, csvMobileOutputFilename));
   
let source = splitEasy(csvFile);

async function launchChromeAndRunLighthouse(url, chromeOptions, lcConfig = null) {
  return chromeLauncher.launch(chromeOptions).then(chrome => {
    chromeOptions.port = chrome.port;
    return lighthouse(url, chromeOptions, lcConfig).then(results => {
      // use results.lhr for the JS-consumable output
      // https://github.com/GoogleChrome/lighthouse/blob/master/types/lhr.d.ts
      // use results.report for the HTML/JSON/CSV output as a string
      // use results.artifacts for the trace/screenshots/other specific case you need (rarer)
      return chrome.kill().then(() => results.lhr)
    });
  });
}

function formatUrl(url){

    if(url.charAt(url.length-1) == '/'){
        //url = url.substring(0, url.length-1);
    }

    if(url.indexOf('?') == -1 && url.indexOf('/experts/') == -1){
        url = url + '?showSplash=0';
    }

    return 'https://' + url;
}

function calculateAverages(lcMetrics){
   var sum = {};

    let i = 0;
    for(i; i < lcMetrics.length; i++){
        var item = lcMetrics[i];

        for(var x in item){
            if(!sum[x]){
                sum[x] = 0;
            }
            sum[x] += item[x];
        }
    }

    if(i==0){
        return null;
    }

    var avg = {};
    for(var x in sum){
        avg[x] = (sum[x] / i).toFixed(2)
    }

    return avg;
}

async function logLighthouseData(items, lhConfig, logger){
    var len = items.length;

    const chromeConfig = {
        chromeFlags: ['--headless']
    };

    let csvHeader = null;

    for(var i = 0; i < len; i++){

        var rawUrl = source[i][0];
        var url = formatUrl(rawUrl);
        var metricsRun = [];

        for(var j = 0; j < 3; j++){


            const data = await launchChromeAndRunLighthouse(url,chromeConfig, lhConfig).then(results => {
                //console.log(results);
                var metrics = {};
                if(results && results.categories){
                    var categories = results.categories;
                    
                    metrics.performanceScore = categories.performance && categories.performance.score ? categories.performance.score : 0;
                    metrics.accessibilityScore = categories.accessibility && categories.accessibility.score ? categories.accessibility.score : 0;
                    metrics.bestPracticesScore = categories['best-practices'] && categories['best-practices'].score ? categories['best-practices'].score : 0;
                    metrics.seoScore = categories.seo && categories.seo.score ? categories.seo.score : 0;       
                }

                if(results && results.audits){
                    if(results.audits['speed-index']){
                        metrics.speedIndexScore = results.audits['speed-index'].score ? results.audits['speed-index'].score : 0;
                        metrics.speedIndexValue = results.audits['speed-index'].numericValue ? Math.round(results.audits['speed-index'].numericValue / 1000) : 0;
                    }

                    if(results.audits['speed-index']){
                        metrics.totalByteWeightScore = results.audits['total-byte-weight'].score ? results.audits['total-byte-weight'].score : 0;
                        metrics.totalByteWeightValue = results.audits['total-byte-weight'].numericValue ? Math.round(results.audits['total-byte-weight'].numericValue / 1000) : 0;
                    }

                    if(results.audits['first-contentful-paint']){
                        metrics.firstContentfulPaintScore = results.audits['first-contentful-paint'].score ? results.audits['first-contentful-paint'].score : 0;
                        metrics.firstContentfulPaintValue = results.audits['first-contentful-paint'].numericValue ? Math.round(results.audits['first-contentful-paint'].numericValue / 1000) : 0;
                    }

                    if(results.audits.interactive){
                        metrics.interactiveScore = results.audits.interactive.score ? results.audits.interactive.score : 0;
                        metrics.interactiveValue = results.audits.interactive.numericValue ? Math.round(results.audits.interactive.numericValue / 1000) : 0;
                    }
                }
                return metrics;
            });
            metricsRun.push(data);
            //console.log(metricsRun);
        }

        var avgCalc = calculateAverages(metricsRun);

        const output = [url];

        for(var x in avgCalc){
            output.push(avgCalc[x]);
        }

        if(csvHeader == null){
            csvHeader = ['URL'];
            for(var x in avgCalc){
                csvHeader.push(headerMap[x]);
            }
            logger.write(csvHeader.join(',') + newLine);
        }

        logger.write(output.join(',') + newLine);

    }
}

async function logData(){
    await logLighthouseData(source, mobileConfig, mobileLogger);
    await logLighthouseData(source, desktopConfig, desktopLogger);
}
logData();



