import API_KEY from "./apikey.js";

const container = document.querySelector(".container");
const chatsContainer = document.querySelector('.chats-container-js');
const promptForm = document.querySelector('.prompt-form-js');
const themeToggle = document.querySelector('#theme-toggle-btn');
const promptInput = promptForm.querySelector('.prompt-value-js');
const fileInput = promptForm.querySelector('#file-input');
const fileUploadWrapper = promptForm.querySelector('.file-upload-wrapper');

const chatHistory = [];
const userData = { message: "", file: {} };
let typingInterval, controller;

const API_url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

const scrollToBottom = () => container.scrollTo({ top: container.scrollHeight, behaviour: "smooth" });

// Make the API call and get the response
const generateResponse = async(AIMsgDiv) => {

  const textEle = AIMsgDiv.querySelector(".message-text");
  controller = new AbortController();

  // simulate typing effect for AI responses
  const typingEffect = (text, textEle) => {
    textEle.textcontent = "";
    const words = text.split(" ");
    let wordIndex = 0;

    // setting an interval to type each word
    typingInterval = setInterval(() => {
      if (wordIndex < words.length) {
        textEle.textContent += (wordIndex === 0 ? "" : " ") + words[wordIndex++];
        scrollToBottom();
      }
      else {
        clearInterval(typingInterval);
        document.body.classList.remove("AI-responding");
      }
    }, 50);
  }

  // Add the message and file data to chat history
  chatHistory.push({
    role: "user",
    parts: [{ text: userData.message}, ...(userData.file.data ? 
      [{ inline_data: (({ fileName, isImage, ...rest}) => rest)
        (userData.file) }] : [])]
  });

  try {
    // send the chat histroy to the API to get a reply
    const response = await fetch(API_url, {
      method: "POST",
      headers: { "Content-Type": "application/json"},
      body: JSON.stringify({ contents: chatHistory }),
      signal: controller.signal
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error.message);

    // Process the response text and display it with typing effect
    const responseText = data.candidates[0].content.parts[0].text.replace(/\*\*([^*]+)\*\*/g, "$1").trim();
    typingEffect(responseText, textEle);

    chatHistory.push({role: "model",
      parts: [{text: responseText }]});

    console.log(chatHistory);

  }
  catch (error) {
    textEle.style.color = "#febf34";
    textEle.textContent = error.name === "AbortError" ? "Response generation stopped" : error.message;
    document.body.classList.remove("AI-responding");
    scrollToBottom();
  }
  finally {
    userData.file = {};
  }
}

// Function to create message elements
const createMsgElement = (content, ...classes) => {
  const div = document.createElement('div');
  div.classList.add("msg", ...classes);
  div.innerHTML = content;
  return div;
}

// Function to handle form submission
const handleFormSubmit = (e) => {
  e.preventDefault();
  const usermsg = promptInput.value.trim();
  if(!usermsg || document.body.classList.contains("AI-responding")) return;

  promptInput.value = "";
  userData.message = usermsg;
  document.body.classList.add("AI-responding", "chats-active");

  // generate user html with optonal file attachment

  const userMsgHTML = `
    <p class="message-text"><p>
    ${userData.file.data ? (userData.file.isImage ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="img-attachment" />` 
      : `<p class="file-attachment"><span class="material-symbols-rounded">description</span>${userData.file.fileName}</p>`
    ) : ""}
  `;
  const userMsgDiv = createMsgElement(userMsgHTML, "user-message");

  userMsgDiv.querySelector(".message-text").textContent = usermsg;
  chatsContainer.appendChild(userMsgDiv);
  fileUploadWrapper.classList.remove("active", "img-attached", "file-attached");

  setTimeout(() => {
    // generate AI message html and addin the chats container in 500ms
    let AIMsgHTML;
    AIMsgHTML = `<img src="amadeus.png" class="avatar"><p class="message-text"></p>`;
    const AIMsgDiv = createMsgElement(AIMsgHTML, "ai-message", "loading");
    chatsContainer.appendChild(AIMsgDiv);
    generateResponse(AIMsgDiv);
  }, 500);
}

// handle file inpy change
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;

  const isImage = file.type.startsWith("image/")
  const reader = new FileReader();
  reader.readAsDataURL(file);

  reader.onload = (e) => {
    fileInput.value = "";
    const base64String = e.target.result.split(",")[1]
    fileUploadWrapper.querySelector(".preview-file").src = e.target.result;
    fileUploadWrapper.classList.add("active", isImage ? "img-attached" : "file-attached");

    // store file data in userData obj
    userData.file = { fileName: file.name, data: base64String, mime_type: file.type, isImage};
  }
});

document.querySelectorAll(".suggestions-item").forEach(item => {
  item.addEventListener("click", () => {
    promptInput.value = item.querySelector(".text").textContent;
    promptForm.dispatchEvent(new Event("submit"));
  })
})

// cancel file functionality
document.querySelector("#cancel-file-btn").addEventListener("click", () => {
  fileUploadWrapper.classList.remove("active", "img-attached", "file-attached");
  userData.file = {}
});

// stop response functionality
document.querySelector("#stop-prompt-btn").addEventListener("click", () => {
  userData.file = {}
  controller?.abort();
  clearInterval(typingInterval);
  document.body.classList.remove("AI-responding");
});

// delete chats
document.querySelector("#delete-chats-btn").addEventListener("click", () => {
  chatHistory.length = 0;
  chatsContainer.innerHTML = '';
  document.body.classList.remove("AI-responding", "chats-active");
});

// show/hide controls for phone
document.addEventListener("click", ({ target }) => {
  const wrapper = document.querySelector(".prompt-wrapper");
  const shouldHide = target.classList.contains("prompt-input-box") || (wrapper.classList.contains("hide-controls")
                      && (target.id === "add-file-btn" || target.id === "stop-response-btn"));
  wrapper.classList.toggle("hide-controls", shouldHide);
});

themeToggle.addEventListener("click", (AIMsgHTML) => {
  const isLightTheme = document.body.classList.toggle("light-theme");
  themeToggle.textContent = isLightTheme ? "dark_mode" : "light_mode";
  localStorage.setItem("themeColor", isLightTheme ? "light_mode" : "dark_mode");
});

// get the initial theme from localStorage
const isLightTheme = localStorage.getItem("themeColor") === "light_mode";
themeToggle.textContent = isLightTheme ? "dark_mode" : "light_mode";
document.body.classList.toggle("light-theme", isLightTheme); 

promptForm.addEventListener("submit", handleFormSubmit);
promptForm.querySelector('#add-file-btn').addEventListener("click", () => fileInput.click())

