
const loginForm = document.getElementById("login-form");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const errorMessage = document.getElementById("error-message");

if(loginForm){
loginForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const username = usernameInput.value;
    const password = passwordInput.value;

    if (username === "admin" && password === "123456") {
        window.location.href = "home.html";
    } else {
        errorMessage.textContent = "用户名或密码错误！";
        errorMessage.style.color = "red";
    }
});
}

/* 自动轮播图 */

const carouselImage = document.getElementById("carousel-image");
const carouselCaption = document.getElementById("carousel-caption");

if (carouselImage && carouselCaption) {

    // 保存三张图片的信息
    const photos = [
        {
            src: "images/草地音乐节.jpg",
            title: "草地音乐节"
        },
        {
            src: "images/校庆志愿者.jpg",
            title: "校庆优秀志愿者"
        },
        {
            src: "images/迎新晚会.jpg",
            title: "迎新晚会"
        }
    ];

    // 当前显示第几张（数组从 0 开始）
    let currentIndex = 0;

    // 切换到下一张图片
    function nextPhoto() {
        currentIndex = (currentIndex + 1) % photos.length;

        carouselImage.src = photos[currentIndex].src;
        carouselImage.alt = photos[currentIndex].title;
        carouselCaption.textContent = photos[currentIndex].title;
    }

    // 每隔 3000 毫秒执行一次
    setInterval(nextPhoto, 3000);
}


/* 留言板：发布、保存、显示和删除 */

const messageInput = document.getElementById("message-input");
const messageButton = document.getElementById("message-button");
const messageList = document.getElementById("message-list");

if (messageInput && messageButton && messageList) {
    // 读取历史留言
    let messages = JSON.parse(
        localStorage.getItem("messages") || "[]"
    );

    // 保存留言到浏览器
    function saveMessages() {
        localStorage.setItem(
            "messages",
            JSON.stringify(messages)
        );
    }

    // 渲染所有留言
    function renderMessages() {
        messageList.replaceChildren();

        messages.forEach(function(message, index) {
            const card = document.createElement("div");
            card.className = "message-item";

            const content = document.createElement("p");
            content.className = "message-content";
            content.textContent = message.text;

            const deleteButton = document.createElement("button");
            deleteButton.className = "message-delete";
            deleteButton.type = "button";
            deleteButton.textContent = "删除";

            deleteButton.addEventListener("click", function() {
                messages.splice(index, 1);
                saveMessages();
                renderMessages();
            });

            card.append(content, deleteButton);
            messageList.appendChild(card);
        });
    }

    // 发布留言
    messageButton.addEventListener("click", function() {
        const text = messageInput.value.trim();

        if (text === "") {
            alert("请输入留言内容！");
            return;
        }

        messages.push({
            text: text,
            time: new Date().toLocaleString()
        });

        saveMessages();
        renderMessages();
        messageInput.value = "";
    });

    // 初次加载时显示历史留言
    renderMessages();
}
