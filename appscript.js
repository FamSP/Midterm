// config
const ssId = "1aVQg5mDSk1KIYBqmzLEIptjsaO-tg6KTWKuTPVdmQII";
const productSheetName = "Products";
const orderSheetName = "orders";
const paymentSheetName = "payments";

// define global variables
const ss = SpreadsheetApp.openById(ssId);
const productsSheet = ss.getSheetByName(productSheetName); // active sheet
const ordersSheet = ss.getSheetByName(orderSheetName);
const paymentsSheet = ss.getSheetByName(paymentSheetName);
const Logger = BetterLog.useSpreadsheet(ssId); // use Logger directly

function doGet(e) {
  return HtmlService.createTemplateFromFile('home').evaluate();
}

function doPost(e) {
  const dialogFlowDATA = JSON.parse(e.postData.contents);
  const intent = dialogFlowDATA.queryResult.intent.displayName;
  Logger.log(intent);
  const userMessage = dialogFlowDATA.queryResult.queryText;
  Logger.log(userMessage);

  // Log the entire request to troubleshoot
  Logger.log(JSON.stringify(dialogFlowDATA));

  const userId = getUserIdFromRequest(dialogFlowDATA) || "Unknown"; // Ensure no undefined error occurs
  Logger.log(userId); 

  if (intent === "Show menu") {
    return getMenu();
  }

  if (intent === "Make an order - quantity - yes"){
    return madeAnOrder(dialogFlowDATA, userId);
  }

      if (intent === "End Process"){
    return endProcess(userId);
  }

        if (intent === "End Process - Address"){
    return adDress(dialogFlowDATA , userId);
  }
}

function getUserIdFromRequest(request) {
  // Safely access userId with logging for troubleshooting
  try {
    const userId = request?.originalDetectIntentRequest?.payload?.data?.source?.userId || null;
    return userId;
  } catch (error) {
    Logger.log(`Error extracting userId: ${error}`);
    return null; // Return null if any error occurs
  }
}


function getMenu() {
  const tableArray = productsSheet.getRange(2, 1, productsSheet.getLastRow() - 1, productsSheet.getLastColumn()).getValues();
  let bubbles = [];

  for (let i = 0; i < tableArray.length; i++) {
    const name = tableArray[i][1]; // Assuming column 2 has the name
    const price = tableArray[i][2]; // Assuming column 3 has the price
    const description = tableArray[i][3]; // Assuming column 4 has the description
    const publicImg = tableArray[i][5]; // Assuming column 6 has the image URL

    let bubble = {
      "type": "bubble",
      "hero": {
        "type": "image",
        "url": publicImg,
        "size": "full",
        "aspectRatio": "20:13",
        "aspectMode": "cover"
      },
      "body": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": name,
            "weight": "bold",
            "size": "xl"
          },
          {
            "type": "text",
            "text": `ราคา: ฿${price}`,
            "size": "sm",
            "color": "#555555",
            "margin": "md"
          },
          {
            "type": "text",
            "text": description,
            "size": "sm",
            "color": "#aaaaaa",
            "wrap": true,
            "margin": "md"
          }
        ]
      },
      "footer": {
        "type": "box",
        "layout": "vertical",
        "spacing": "sm",
        "contents": [
          {
            "type": "button",
            "style": "primary",
            "action": {
              "type": "message",
              "label": "สั่งซื้อ",
              "text": `สั่งซื้อ ${name} ราคา ${price} บาท`
            }
          }
        ]
      }
    };

    bubbles.push(bubble);
  }

  const result = {
    "fulfillmentMessages": [
      {
        "platform": "line",
        "type": 4,
        "payload": {
          "line": {
            "type": "flex",
            "altText": "Robinwood Jewelry",
            "contents": {
              "type": "carousel",
              "contents": bubbles
            }
          }
        }
      }
    ]
  };

  const replyJSON = ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  return replyJSON;
}

function madeAnOrder(dialogFlowDATA, userId) {
  const orderItem = dialogFlowDATA.queryResult.parameters;

  const itemName = orderItem.jewelry;
  const itemQuantity = orderItem.number;
  const itemUnitPrice = orderItem.price;
  const total = itemQuantity * itemUnitPrice;
  const status = "Pending";

  // Get last row
  const lastRow = ordersSheet.getLastRow() + 1; // Save in next row

  // Save data to Google Sheet
  ordersSheet.getRange(lastRow, 1).setValue(new Date()); // row number, column number
  ordersSheet.getRange(lastRow, 2).setValue(userId);
  ordersSheet.getRange(lastRow, 3).setValue(itemName);
  ordersSheet.getRange(lastRow, 4).setValue(itemQuantity);
  ordersSheet.getRange(lastRow, 5).setValue(itemUnitPrice);
  ordersSheet.getRange(lastRow, 6).setValue(total);
  ordersSheet.getRange(lastRow, 7).setValue(status);

  const result = {
    "fulfillmentMessages": [
      {
        "platform": "line",
        "type": 4,
        "payload": {
          "line": {
            "type": "template",
            "altText": "ยืนยันการสั่งซื้อ",
            "template": {
              "type": "confirm",
              "actions": [
                {
                  "type": "message",
                  "label": "ต้องการ",
                  "text": "Show Menu"
                },
                {
                  "type": "message",
                  "label": "ไม่ต้องการ",
                  "text": "สั่งครบแล้ว"
                }
              ],
              "text": "บันทึกรายการสำเร็จ คุณต้องการทำรายการสั่งซื้อเพิ่มอีกหรือไม่คะ"
            }
          }
        }
      }
    ]
  };

  const replyJSON = ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  return replyJSON; // Added return statement
}








function endProcess(userId) {
  const tableArray = ordersSheet.getRange(2, 1, ordersSheet.getLastRow() - 1, ordersSheet.getLastColumn()).getValues();
  let bubbles = [];
  let total = 0;

  for (let i = 0; i < tableArray.length; i++) {
    const orderuserid = tableArray[i][1];

    if (orderuserid === userId) {
    const name = tableArray[i][2]; // Assuming column 3 has the name
    const quantity = tableArray[i][3]; // Assuming column 4 has the quantity
    const price = tableArray[i][5]; // Assuming column 6 has the price

    total += parseFloat(price); // Summing up the total price

    let bubbleReceipt = { 
      "type": "box",
      "layout": "horizontal",
      "contents": [
        {
          "type": "text",
          "text": `${name}`,
          "size": "sm",
          "color": "#555555"
        },
        {
          "type": "text",
          "text": `${quantity}`,
          "size": "sm",
          "align": "end"
        },
        {
          "type": "text",
          "text": `฿${price}`,
          "size": "sm",
          "color": "#111111",
          "align": "end"
        }
      ]
    };

    bubbles.push(bubbleReceipt);
    }
  }

  // Ensure the total is properly formatted to 2 decimal places
  const formattedTotal = total.toFixed(2);

  const result = {
    "fulfillmentMessages": [
      {
        "platform": "line",
        "type": 4,
        "payload": {
          "line": {
            "type": "flex",
            "altText": "RECEIPT",
            "contents": {
              "type": "bubble",
              "body": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                  {
                    "type": "text",
                    "text": "RECEIPT",
                    "weight": "bold",
                    "color": "#1DB446",
                    "size": "sm"
                  },
                  {
                    "type": "text",
                    "text": "Robinwood.TH",
                    "weight": "bold",
                    "size": "xxl",
                    "margin": "md"
                  },
                  {
                    "type": "text",
                    "text": "Ratchaburi",
                    "size": "xs",
                    "color": "#aaaaaa",
                    "wrap": true
                  },
                  {
                    "type": "separator",
                    "margin": "xxl"
                  },
                  {
                    "type": "box",
                    "layout": "horizontal",
                    "contents": [
                      {
                        "type": "text",
                        "text": "Order",
                        "size": "sm",
                        "align": "start"
                      },
                      {
                        "type": "text",
                        "text": "Amount",
                        "align": "end",
                        "size": "sm",
                        "margin": "none",
                        "gravity": "bottom",
                        "position": "relative"
                      },
                      {
                        "type": "text",
                        "text": "Price",
                        "align": "end",
                        "size": "sm"
                      }
                    ]
                  },
                  {
                    "type": "box",
                    "layout": "vertical",
                    "margin": "xxl",
                    "spacing": "sm",
                    "contents": bubbles // Add dynamic items here
                  },
                  {
                    "type": "separator",
                    "margin": "xxl"
                  },
                  {
                    "type": "box",
                    "layout": "horizontal",
                    "margin": "xxl",
                    "contents": [
                      {
                        "type": "text",
                        "text": "TOTAL",
                        "size": "sm",
                        "color": "#555555"
                      },
                     
                      {
                        "type": "text",
                        "text": `฿ ${formattedTotal}`, // Use dynamic total here
                        "size": "sm",
                        "color": "#111111",
                        "align": "end"
                      }
                    ]
                  },
                  {
                    "type": "separator",
                    "margin": "xxl"
                  },
                  {
                    "type": "box",
                    "layout": "horizontal",
                    "margin": "md",
                    "contents": [
                      {
                        "type": "text",
                        "text": "PAYMENT QR",
                        "size": "xs",
                        "color": "#aaaaaa"
                      },
                      {
                        "type": "image",
                        "url": `https://promptpay.io/0983809919/${formattedTotal}`,
                        "margin": "none"
                      }
                    ]
                  },
                  {
                    "type": "separator",
                    "margin": "xxl"
                  },
                  {
                    "type": "box",
                    "layout": "horizontal",
                    "margin": "md",
                    "contents": [
                       {
                        "type": "text",
                        "text": "หลังจากชำระเงินแล้วส่งที่อยู่ด้วยนะคะ",
                        "size": "sm",
                        "color": "#FF0000",
                        "align": "center"
                      }
                    ]
                    }
                ]
              },
              "styles": {
                "footer": {
                  "separator": true
                }
              }
            }
          }
        }
      }
    ]
  };

  const replyJSON = ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  return replyJSON;
}


function adDress(dialogFlowDATA , userId) {

    const tableArray = ordersSheet.getRange(2, 1, ordersSheet.getLastRow() - 1, ordersSheet.getLastColumn()).getValues();
    const orderAdress = dialogFlowDATA.queryResult.parameters;
  for (let i = 0; i < tableArray.length; i++) {
    const orderuserid = tableArray[i][1];

    if (orderuserid === userId) {
    const itemName = tableArray[i][2]; // Assuming column 3 has the name
    const itemQuantity = tableArray[i][3]; // Assuming column 4 has the quantity
    const itemUnitPrice = tableArray[i][5]; // Assuming column 6 has the price
      


    const usertell = orderAdress.tell;
    const useraddress = orderAdress.address;
      const username = orderAdress.name;
    const status = "Paid";
    const tell = `0 ${usertell}`

    // Get last row
    const lastRow = paymentsSheet.getLastRow() + 1; // Save in next row

    // Save data to Google Sheet
    paymentsSheet.getRange(lastRow, 1).setValue(new Date()); // row number, column number
    paymentsSheet.getRange(lastRow, 2).setValue(itemName);
    paymentsSheet.getRange(lastRow, 3).setValue(itemQuantity);
    paymentsSheet.getRange(lastRow, 4).setValue(itemUnitPrice);
    paymentsSheet.getRange(lastRow, 5).setValue(status);
    paymentsSheet.getRange(lastRow, 6).setValue(useraddress);
    paymentsSheet.getRange(lastRow, 7).setValue(username);
    paymentsSheet.getRange(lastRow, 8).setValue(tell);
    }
  }
  
}
