const wd = require('wd');
const winctl = require('winctl');
const { address, port } = require('./package.json').config;
const colors = require('colors');
const { sleep, assert, toHexString } = require('./helper');


(async function main() {

    const client = wd.promiseChainRemote({
        host: address,
        port
    });

    const callback = function() {
        console.log(
            arguments.length
                ? [].join.call(arguments, ' | ').grey
                : ''
        );
    };
    ['status', 'command', 'http'].forEach(e => client.on(e, callback)); 

    const desiredCapabilities = {
        platformName: "Windows",
        deviceName: "WindowsPC",
    };



    await sleep(5); // Wait for the window to become available to Appium when Word was launched just before
    /**
     * 
     * Assuming "npm run sideload" was run first.
     * Without prior sideloading: Word must be started manually or by replacing appTopLevelWindow with:
     *    desiredCapabilities.app = "WINWORD.EXE",
     *    desiredCapabilities.appArguments = "/q /w"
     * Note that this only works if the Word ribbon bar has the launch button for the add-in (sideloading adds this button automatically).
     */
    const wordwin = await winctl.FindByTitle("Word"); // Assuming there's only 1 window with 'Word' in title.
    const winHandle = wordwin.getHwnd();
    desiredCapabilities.appTopLevelWindow = toHexString(winHandle); // Attaching the already opened window to Appium
    await client.init(desiredCapabilities);

    /**
     * Elements' names, classes and IDs can be found using inspect.exe from the Windows SDK.
     * It's located under "C:\Program Files (x86)\Windows Kits\10\bin\<version>\x64".
     * The mapping between attributes as shown by inspect.exe and webdriver locator values can be seen here: https://github.com/microsoft/WinAppDriver
     */
    const commandsGroup = await client
        .elementByName('MsoDockTop')
        .elementByName('Commands Group'); // value from manifest.xml (CommandsGroup.Label)
    const addinLauncher = await commandsGroup.elementByName('Show Taskpane'); // value from manifest.xml (TaskpaneButton.Label)
    await addinLauncher.click();

    // loading add-in from web server might take a while
    const taskPaneApp = await client.waitForElement(
        'name',
        'Contoso Task Pane Add-in', // <title> tag value from My Office Add-in/taskpane/taskpane.html
        5000
    );
    const logo = await taskPaneApp.elementByName('Contoso'); // the <img>'s title attr
    const isDisplayed = await logo.isDisplayed();
    assert(isDisplayed, 'The logo should be displayed');

    const runBtn = await taskPaneApp.elementByAccessibilityId('run'); // HTML-id of the RUN-Button
    await runBtn.click();

    const documentBody = await client.elementByAccessibilityId('Body');
    const text = await documentBody.text();
    assert(text === 'Hello World\r\r', 'The document\'s text should be equal to "Hello World"');

    console.log('All tests passed'.green);
    await client.quit();
})();