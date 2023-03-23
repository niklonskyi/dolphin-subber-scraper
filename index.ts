import {HTTPRequest, Page, PageEmittedEvents} from "puppeteer-core";

const config = require('config')
const axios = require('axios')
const puppeteer = require('puppeteer-core')

// Get Dolphin token
// Get token function isn't working, because of captcha

// async function getToken() {
//     const username = config.username;
//     const password = config.password;
//     try {
//         const response = await axios.post('https://anty-api.com/auth/login', {
//             username,
//             password
//         })
//         console.log(response);
//     }
//     catch (error) {
//         console.log(error);
//     }
// }

interface IData {
    id: Number
}

async function getProfileIds() {
    try {
        const response = await axios.get('https://anty-api.com/browser_profiles', {
            headers: {
                'Authorization': `Bearer ${config.token}`,
            }
        })
        const profileList = response.data.data;
        if (response.data && profileList.length > 0) {
            const profileIdsList = profileList.map((profile: IData) => profile.id);
            return(profileIdsList);
        }
        else console.log('No profiles');
    }
    catch (error) {
        console.log(error);
    }
}

async function enterProfile(profileId: Number) {
    try {
        const {data} = await axios.get(`http://localhost:3001/v1.0/browser_profiles/${profileId}/start?automation=1`);
        return data.automation;
    }
    catch (error) {
        console.log(error);
    }
}


// getToken();
async function automation() {
    const profileIdsList = await getProfileIds();
    const result: String[] = [];
    for (let i = 0; i < profileIdsList.length; i++) {
        const {port, wsEndpoint} = await enterProfile(profileIdsList[i]);

        // НЕПОСРЕДСТВЕННО ПОДКЛЮЧЕНИЕ
        const browser = await puppeteer.connect({
            browserWSEndpoint: `ws://127.0.0.1:${port}${wsEndpoint}`
        });

        // С
        const page = await browser.newPage();
        await page.setRequestInterception(true);
        page.on('request', (req: HTTPRequest) => {
            if(req.resourceType() == 'stylesheet' || req.resourceType() == 'font' || req.resourceType() == 'image'){
                req.abort();
            }
            else {
                req.continue();
            }
        });
        await page.goto(config.link, {timeout: 0});
        let element;
        try {
            element = await page.waitForSelector('.css-10aym35');
            const text = await element.evaluate((el: any) => el.textContent);
            result.push(text);
        }
        catch (error) {
            result.push('Error');
        }

        await page.close();
        await browser.close();
    }
    return result;
}

async function getRequirements(page: Page): Promise<Map<string, string>> {
    const requirementsMap: Map<string, string> = new Map();

    await page.goto(config.link, {timeout: 0, waitUntil: 'networkidle0'});
    const actions = await page.$$eval('li.css-qq28hd > span.css-lgbo0i', (spans) => {return spans.map(span => span.textContent.split(' ')[0])});
    const links = await page.$$eval('li.css-qq28hd > span.css-lgbo0i > a', (links) => {return links.map(link => link.href)});

    for (let i = 0; i < actions.length; i++) {
        requirementsMap.set(actions[i], links[i]);
    }

    return requirementsMap;
}



async function printResult() {
    console.log(await automation());
}

printResult();
