// Modules to control application life and create native browser window
const { app, BrowserWindow } = require("electron");
const path = require("path");

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      devTools: true,
      nodeIntegration: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // and load the index.html of the app.
  mainWindow.loadFile("index.html");

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  HandleApp();

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});

let HandleApp = () => {
  let logger = (input) => {
    // let win = BrowserWindow.getAllWindows()[0];
    // if (win) {
    //   win.webContents.executeJavaScript(
    //     `
    // window.logStuff(${JSON.stringify(input, null, "\t")});
    // `,
    //     true
    //   );
    // }
  };

  // without Babel in ES2015
  const { NFC } = require("nfc-pcsc");

  const nfc = new NFC(); // optionally you can pass logger

  const { dialog } = require("electron");

  const fs = require("fs");

  let getFile = () =>
    dialog.showOpenDialog(BrowserWindow.getAllWindows()[0], {
      properties: ["openFile"],
    });

  var admin = require("firebase-admin");
  const say = require("say");
  const getUuid = require("uuid-by-string");

  getFile().then((f) => {
    let filePath = f.filePaths[0];
    if (filePath) {
      let str = fs.readFileSync(filePath, { encoding: "utf8" });
      let serviceAccount = JSON.parse(str);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL:
          "https://my3dworld-club-default-rtdb.asia-southeast1.firebasedatabase.app",
      });

      const CARD_WRITTEN_BY = "SUSAYE";

      const nfc = new NFC(); // const nfc = new NFC(pretty); // optionally you can pass logger to see internal debug logs
      const nfcCard = require("nfccard-tool");

      nfc.on("reader", async (reader) => {
        logger(`device attached`, reader);

        // enable when you want to auto-process ISO 14443-4 tags (standard=TAG_ISO_14443_4)
        // when an ISO 14443-4 is detected, SELECT FILE command with the AID is issued
        // the response is available as card.data in the card event
        // you can set reader.aid to:
        // 1. a HEX string (which will be parsed automatically to Buffer)
        reader.aid = "F222222222";
        // 2. an instance of Buffer containing the AID bytes
        // reader.aid = Buffer.from('F222222222', 'hex');
        // 3. a function which must return an instance of a Buffer when invoked with card object (containing standard and atr)
        //    the function may generate AIDs dynamically based on the detected card
        // reader.aid = ({ standard, atr }) => {
        // 	return Buffer.from('F222222222', 'hex');
        // };

        const getID = function () {
          return (
            "_" +
            Math.random().toString(36).substr(2, 9) +
            "_" +
            Math.random().toString(36).substr(2, 9) +
            "_" +
            Math.random().toString(36).substr(2, 9)
          );
        };

        let working = false;
        reader.on("card", async (card) => {
          if (working) {
            return;
          }

          reader
            .read(0, 20)
            .then((cardHeader) => {
              working = true;
              return nfcCard.parseInfo(cardHeader);
            })
            .then((cardInfo) => {
              // Check if a write permissions are not available
              if (!cardInfo.parsedHeader.hasWritePermissions) {
                return Promise.reject("Write Permission disabled");
              }
            })
            .then(async () => {
              try {
                // There might be a NDEF message and we are able to read the tag
                if (
                  nfcCard.isFormatedAsNDEF() &&
                  nfcCard.hasReadPermissions() &&
                  nfcCard.hasNDEFMessage()
                ) {
                  // Read the appropriate length to get the NDEF message as buffer
                  const NDEFRawMessage = await reader.read(
                    4,
                    nfcCard.getNDEFMessageLengthToRead()
                  ); // starts reading in block 0 until 6
                  // Parse the buffer as a NDEF raw message

                  const NDEFMessage = nfcCard.parseNDEF(NDEFRawMessage);
                  // console.log("NDEFMessage:", NDEFMessage);
                  let msg = NDEFMessage.find((e) => e.type === "text");
                  if (msg && msg.text) {
                    let cardID = msg.text;
                    var db = admin.database();
                    let cardRawInfo = db.ref("card-private-info").child(cardID);
                    let val = (await cardRawInfo.get()).val();
                    if (val?.cardID === cardID) {
                      const notifier = require("node-notifier");
                      notifier.notify({
                        title: "Card is already in Database",
                        message: `${cardID}`,
                        sound: "Ping",
                      });

                      say.speak("Already Successfully written in database!");
                      return Promise.reject("already inside database");
                    }
                  }
                } else {
                  console.log(
                    "Could not parse anything from this tag: \n The tag is either empty, locked, has a wrong NDEF format or is unreadable."
                  );
                }
              } catch (e) {
                // Clear any previously stored Data
                return reader.write(
                  4,
                  nfcCard.prepareBytesToWrite([{}]).preparedData
                );
              }
            })
            .then((_) => {
              // Clear any previously stored Data
              return reader.write(
                4,
                nfcCard.prepareBytesToWrite([{}]).preparedData
              );
            })
            .then(async (_) => {
              let createdAt = new Date();
              let time = createdAt.getTime();
              let cardID = getID();
              let uuid = getUuid(cardID + time, 5);

              //
              // // Initialize Data that should be written
              const data = nfcCard.prepareBytesToWrite([
                {
                  type: "text",
                  text: cardID,
                  language: "en",
                },
                {
                  type: "uri",
                  uri: `https://card.elife.fun/card/${cardID}`,
                },
              ]);

              try {
                await reader.write(4, data.preparedData);
              } catch (e) {
                say.speak("Failed to write card, please try again");
                return;
              }
              // // Write Data

              var db = admin.database();

              //
              let cardRawInfo = db.ref("card-private-info").child(cardID);
              await cardRawInfo.set({
                type: `GenesisCard`,
                hardwareURL: `https://card.elife.fun/card/${cardID}`,
                hardwareBase: `https://card.elife.fun/card/`,
                cardID: cardID,
                time,
                privateUUID: uuid,
                method: `npm(uuid-by-string)(cardID + time, 5)`,
                createdAt,
                cardWrittenBy: CARD_WRITTEN_BY,
              });

              //
              let cardMetaInfo = db.ref("card-meta-info").child(cardID);
              await cardMetaInfo.set({
                cardID: cardID,
                type: `GenesisCard`,
                createdAt,
                time,
                base: `https://card.elife.fun/card/`,
                url: `https://card.elife.fun/card/${cardID}`,
                disabled: false,
              });

              //
              // activation logs

              return {
                cardID,
              };
            })
            .then(({ cardID }) => {
              const notifier = require("node-notifier");
              // String
              notifier.notify({
                title: "Done Writing the Cards",
                message: `${cardID}`,
                sound: "Blow",
              });
            })

            .then((_) => {
              working = false;

              say.speak("Successfully written!");
              console.log("Successfully written At: " + new Date());
            })
            .catch((error) => {
              working = false;
              console.error("Failure: ", error);
            });
        });

        reader.on("error", (err) => {
          logger(`an error occurred`, reader, err);
        });

        reader.on("end", () => {
          logger(`device removed`, reader);
        });
      });

      nfc.on("error", (err) => {
        logger(`an error occurred`, err);
      });

      dialog.showMessageBox(BrowserWindow.getAllWindows()[0], {
        message: "Ready to write cards, click ok to begin....",
      });
    } else {
      dialog
        .showMessageBox(BrowserWindow.getAllWindows()[0], {
          message:
            "Unable to connect to database please select the key file and try again",
        })
        .then(() => {
          HandleApp();
        });
    }
  });
};
