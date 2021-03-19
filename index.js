const wd = require('wd');
const { address, port } = require('./package.json').config;
require('colors');
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

    // start root session to get Word's window handle
    desiredCapabilities.app = 'Root';
    await client.init(desiredCapabilities);
    /**
     * Elements' and windows' names, classes and IDs can be found using inspect.exe from the Windows SDK (https://docs.microsoft.com/en-us/windows/win32/winauto/inspect-objects)
     * Located under "C:\Program Files (x86)\Windows Kits\10\bin\<version>\x64".
     * The mapping between attributes as shown by inspect.exe and webdriver locator values can be seen here: https://github.com/microsoft/WinAppDriver
     */
    const wordWin = await client.elementByClassName('OpusApp'); // Word's window should be the only one with class "OpusApp"
    const winHandle = await wordWin.getAttribute("NativeWindowHandle");
    await client.quit();

    /**
     * Attach to Word window
     * Assuming "npm run sideload" was run first.
     * Without prior sideloading: Word must be started manually or by replacing appTopLevelWindow with:
     *    desiredCapabilities.app = "WINWORD.EXE",
     *    desiredCapabilities.appArguments = "/q /w"
     * only works if the Word ribbon bar has the launch button for the add-in (sideloading adds this button automatically).
     */
    delete desiredCapabilities['app'];
    desiredCapabilities.appTopLevelWindow = toHexString(Number(winHandle));
    await client.init(desiredCapabilities);

    const commandsGroup = await client
        .elementByName('MsoDockTop')
        .elementByName('Commands Group'); // value from manifest.xml (CommandsGroup.Label)
    const addInLauncher = await commandsGroup.elementByName('Show Taskpane'); // value from manifest.xml (TaskpaneButton.Label)
    await addInLauncher.click();

    // loading add-in from web server might take a while
    const taskPaneApp = await client.waitForElement(
        'name',
        'My Office Add-in',
        5000
    );

    const logo = await taskPaneApp.elementByName('Contoso'); // the <img>'s title attr
    const logoIsDisplayed = await logo.isDisplayed();
    assert(logoIsDisplayed, 'The logo should be displayed');

    const welcome = await taskPaneApp.elementByName('Welcome');
    const welcomeIsDisplayed = await welcome.isDisplayed();
    assert(welcomeIsDisplayed, 'The welcome text should be displayed');

    const appBody = await taskPaneApp.elementByAccessibilityId('app-body');
    const runButton = await appBody.elementByAccessibilityId('run'); // HTML-id of the RUN-Button (inspect.exe: AutomationId)
    await runButton.click();
    await sleep(1);

    const documentBody = await client.elementByAccessibilityId('Body');
    const text = await documentBody.text();
    assert(text.includes('Hello World'), `The document's text should contain "Hello World" but was "${text}"`);

    console.log('All tests passed'.green);
    await client.quit();
})();