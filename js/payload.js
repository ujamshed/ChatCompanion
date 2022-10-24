
console.log("Chat Companion Script Injected");

var chatMessages = [];
var currentMessagesList = [];
var DeletedMessages = [];
var wordsPerSecond = 0;

if (document.location.host.includes("youtube")){
  var website = "youtube";
}
else if (document.location.host.includes("twitch")){
  var website = "twitch";
}

const ytObserver = new MutationObserver(function(mutations) {
  mutations.forEach(function(mutation) {
      for(var i = 0; i < mutation.addedNodes.length; i++) {
          if (mutation.addedNodes[i].className === "style-scope yt-live-chat-item-list-renderer")
          {
            var mlist = mutation.addedNodes[0].outerText.split("\n");
            var trim = mlist[1].substring(1);
            var message = mlist[0] + ": " + trim;
            chatMessages.push(message);
            wordsPerSecond += 1;
          }
      };
  });
});

const ytDeletionObserver = new MutationObserver(function(mutations) {
  mutations.forEach(function(mutation) {
      if (mutation.type == "characterData"){
        // mutation.target.nodeValue === "[message retracted]" || mutation.target.nodeValue === "[message deleted]"
        if (mutation.target.nodeValue === "[message retracted]" || mutation.target.nodeValue === "[message deleted]"){
          var deletedMessage = mutation.target.parentNode.previousSibling.previousElementSibling.innerText + ": " + mutation.target.parentNode.previousSibling.innerText;
          DeletedMessages.push(deletedMessage);
        }
      };
  });
});

// Mutation observer object to look for new chat messages for the purposes of counting
const Observer = new MutationObserver(function(mutations) {
  mutations.forEach(function(mutation) {
      for(var i = 0; i < mutation.addedNodes.length; i++) {
          if (mutation.addedNodes[i].className === "chat-line__message")
          {
            chatMessages.push(mutation.addedNodes[i].textContent);
            wordsPerSecond += 1;
          }
      };
  });
});

const deletionObserver = new MutationObserver(function (mutations) {
  mutations.forEach(function (mutation) {
    if (mutation.removedNodes.length > 0){
      var prev_sib = mutation.previousSibling;
      if (prev_sib != null){
        console.log(mutation);
        var deletedMessage = mutation.removedNodes[0].textContent;
        var deletedCheck = deletedMessage.includes(":");
        // Check on deleted messages
        
        if (deletedCheck){
          DeletedMessages.push(deletedMessage);
        };

      };
    };
  });
});

// Function to count the words of interest
function word_check(chatMessages, w1, w2){
  var word1_count = 0;
  var word2_count = 0;

  w1 = w1.toLowerCase();
  w2 = w2.toLowerCase();

  for (var i = 0; i < chatMessages.length; i++){
    var chatMessage = chatMessages[i].split(":")[1];
    var characters = chatMessage.toLowerCase().split(" ");

    for (var j = 0; j < characters.length; j++){

      if (characters[j] == w1){
        word1_count += 1;
      }
      if (characters[j] == w2){
        word2_count += 1;
      }
    };
  }
  return [word1_count, word2_count];
};

// Function to see if chat box is available
function addObserverIfDesiredNodeAvailable(observerName) {
  if (website == "youtube"){
    var element_one = document.querySelectorAll("iframe")[0];
    var chatBox = element_one.contentWindow.document.querySelectorAll('#items.style-scope.yt-live-chat-item-list-renderer')[0];
  }
  else if(website == "twitch"){
    var chatBox = document.getElementsByClassName("Layout-sc-nxg1ff-0 aleoz chat-scrollable-area__message-container")[0];
  }

  if(!chatBox) {
      // The node we need does not exist yet.
      // Wait 500ms and try again
      console.log("Not found yet");
      window.setTimeout(addObserverIfDesiredNodeAvailable,500);
      return;
  }
  console.log("Found it")
  var config = {childList: true, subtree: true};

  if (observerName === "counterObserver" && website == "twitch"){
    console.log("Starting Twitch Counter Observer");
    Observer.observe(chatBox, config);
  }
  else if (observerName === "deletionObserver" && website == "twitch"){
    console.log("Starting Twitch Deletion Observer");
    var config2 = { characterData: true, attributes: true, childList: true, subtree: true, characterDataOldValue: true };
    deletionObserver.observe(chatBox, config2);
  }
  else if (observerName == "counterObserver" && website == "youtube"){
    console.log("Starting Youtube Counter Observer");
    var config2 = { characterData: true, attributes: true, childList: true, subtree: true, characterDataOldValue: true };
    ytObserver.observe(chatBox, config2);
  }
  else if (observerName === "deletionObserver" && website == "youtube"){
    console.log("Starting Youtube Deletion Observer");
    var config2 = { characterData: true, attributes: true, childList: true, subtree: true, characterDataOldValue: true };
    ytDeletionObserver.observe(chatBox, config2);
  }
}

// Listening for popup message to start/stop mutation observer
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.message === "startCountingMessages"){

      addObserverIfDesiredNodeAvailable("counterObserver");

      reset = setInterval(function() {

        var word1 = request.word1;
        var word2 = request.word2;
        
        //console.log(chatMessages);
        var [word1_count, word2_count] = word_check(chatMessages, word1, word2);
        chrome.runtime.sendMessage({method: "getMessages", w1count: word1_count, w2count: word2_count, perSecond: wordsPerSecond});
        chatMessages = []; // clears messages after sending
        wordsPerSecond = 0; // resets message counter
      }, 4000);
    };

    if (request.message === "Popup is closed"){
      clearInterval(reset);
      console.log("Popup is Closed");
      Observer.disconnect();
      ytObserver.disconnect();
    };
  }
);

// Listens to start the Deleted messages section by grabbing all the current chat messages. This will be used to compare with the future grabs to see if anything
// has been deleted.
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {

  if (request.message === "startDeletedMessages"){

    addObserverIfDesiredNodeAvailable("deletionObserver");

    reset = setInterval(function() {
      //console.log(DeletedMessages);
      chrome.runtime.sendMessage({method: "deletedMessages", message: DeletedMessages});
      DeletedMessages = [];
    }, 4000);

  };

  if (request.message === "Popup is closed"){
    clearInterval(reset);
    console.log("Popup is Closed");
    deletionObserver.disconnect();
    ytDeletionObserver.disconnect();
  };
}
);

// Bug #2: Need to handle when non-word elements are thrown in the messages as a seperate element, because the .toLowerCase() will fail. Check to see
// if it is a word before you try and push it to lower case.