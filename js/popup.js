console.log('<----- Extension script started running ----->');

// Send a message directly to content script
function startCounterScript(){
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    
    // Get the words that the user entered
    var w1 = document.getElementById("word1").value;
    var w2 = document.getElementById("word2").value;
    
    var total_w1_count = 0;
    var total_w2_count = 0;

    // Debugging 
    console.log("Sending Message to start counting occurences");
    console.log("Word 1: ", w1);
    console.log("Word 2: ", w2);

    document.getElementById("msgRate").textContent = "Msg Rate: "


    // Send a message directly to content script to start it up.
    chrome.tabs.sendMessage(tabs[0].id, {message: "startCountingMessages", word1: w1, word2: w2});

     // Send messages every so often to get the wins or losses from the content script.

     chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
      if (request.method == "getMessages") {

        total_w1_count += request.w1count;
        total_w2_count += request.w2count;

        document.getElementById("messagesPerSecond").textContent = (request.perSecond / 4) + " msg/second";

        if (request.w1count > 0 || request.w2count > 0){


          var chart = new CanvasJS.Chart("chartContainer",
          {
            data: [
            {
            type: "doughnut",
            dataPoints: [
            {  y: total_w1_count, indexLabel: w1 },
            {  y: total_w2_count, indexLabel: w2 },
            ]
          }
          ]
          });
          chart.render();
      }
      }
    });
 
    // Handles when the popup is closed
    document.addEventListener('visibilitychange', function (){
       // clearInterval(reset);
      chrome.tabs.sendMessage(tabs[0].id, {message: "Popup is closed"}, function(response) {
        console.log("Last messages from content script: ", response);
      });
    }, false);

  });
};

// Send a message directly to content script
function startDeletedMessagesScript(){
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    
    // Debugging 
    console.log("Sending Message to start finding Deleted Messages");

    // Next steps include sending the words that the user has entered to the script using the message JSON to search for them.
    var tag = document.createElement("p");
    var tag2 = document.createElement("em");
    var text = document.createTextNode("Moderator Deleted Messages:");
    tag.appendChild(tag2)
    tag2.appendChild(text);
    var element = document.getElementById("DeletedChatMessages");
    element.appendChild(tag);

    // Send a message directly to content script to start it up.
    chrome.tabs.sendMessage(tabs[0].id, {message: "startDeletedMessages"});

     // Send messages every so often to get the wins or losses from the content script.
     chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        //console.log(request)
        if (request.method === "deletedMessages"){
          if (request.message.length > 0) {
            for (var i = 0; i < request.message.length; i++){
              var tag = document.createElement("p");
              var text = document.createTextNode(request.message[i]);
              tag.appendChild(text);
              var element = document.getElementById("DeletedChatMessages");
              element.appendChild(tag);
              element.lastElementChild.scrollIntoView(); // scrolls the scroll bar down to the latest message.
          }
          }
        }
     });

    // Handles when the popup is closed
    document.addEventListener('visibilitychange', function (){
      chrome.tabs.sendMessage(tabs[0].id, {message: "Popup is closed"}, function(response) {
        console.log("Last messages from content script: ", response);
      });
    }, false);

  });
};

// Switch between tabs
function switchTab1(){
  x = document.getElementById("countingMessages");
  y = document.getElementById("deletedMessages");

    if (x.style.display === "none") {
      x.style.display = "block";
      y.style.display = "none";
      document.getElementById("countingMessagesTab").style.backgroundColor = "#ccc";
      document.getElementById("deletedMessagesTab").style.backgroundColor = "#f1f1f1";
    }
    else {
      return;
    };
};

function switchTab2(){
  x = document.getElementById("countingMessages");
  y = document.getElementById("deletedMessages");

    if (y.style.display === "none") {
      y.style.display = "block";
      x.style.display = "none";
      document.getElementById("deletedMessagesTab").style.backgroundColor = "#ccc";
      document.getElementById("countingMessagesTab").style.backgroundColor = "#f1f1f1";
    }
    else {
      return;
    };
};

document.getElementById('startCountingButton').onclick = startCounterScript;
document.getElementById('startDeletedMessagesButton').onclick = startDeletedMessagesScript;
document.getElementById('countingMessagesTab').onclick = switchTab1;
document.getElementById('deletedMessagesTab').onclick = switchTab2;