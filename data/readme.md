# Google Lighthouse Metrics Collector

Uses Lighthouse and headless Chrome to collect Lighthouse scores and times.

3 requests are made for both desktop and mobile. The average is then calculated and output to a mobile and desktop CSV file.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Inputs](#inputs)
- [Outputs](#outputs)

## Installation
 
`npm install`

## Usage

`npm start`

## Inputs

Inputs are a CSV file of URLs (minus protocol). 

The following line can be changed to point to a particular CSV input file. 
`const csvInputFilename = './data/short-urls.csv';`

## Outputs

Output is two CSV files with metrics. desktop-output.csv and mobile-output.csv
