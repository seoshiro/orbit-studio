import {chromium} from '@playwright/test';
export const launchBrowser=()=>chromium.launch({headless:true,...(process.platform==='win32'?{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'}:{})});
