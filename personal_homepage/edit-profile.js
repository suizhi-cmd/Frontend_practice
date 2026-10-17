const fields = {
    school: "学校",
    college: "学院",
    major: "专业",
    interests: "兴趣",
    learning: "正在学习",
    currentProject: "正在进行的项目",
    pastProjects: "做过的项目"
};

const form = document.getElementById("profile-edit-form");
const container = document.getElementById("profile-fields");
const statusText = document.getElementById("edit-status");
const saveButton = document.getElementById("save-profile");
const passwordInput = document.getElementById("edit-password");

async function initialize() {
    try {
        const response = await fetch("/api/profile", {
            cache: "no-store"
        });

        if (!response.ok) throw new Error("读取资料失败，请刷新重试。");

        const profile = await response.json();

        for (const [field, labelText] of Object.entries(fields)) {
            const label = document.createElement("label");
            label.htmlFor = field;
            label.textContent = labelText;

            const input = document.createElement("textarea");
            input.id = field;
            input.name = field;
            input.rows = 2;
            input.maxLength = 1000;
            input.value = profile[field] || "";

            container.append(label, input);
        }

        saveButton.disabled = false;
        statusText.textContent = "资料已加载，可以开始修改。";
    } catch (error) {
        statusText.textContent = error.message;
    }
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    saveButton.disabled = true;
    statusText.textContent = "正在保存…";

    const profile = {};

    for (const field of Object.keys(fields)) {
        profile[field] = form.elements.namedItem(field).value;
    }

    try {
        const response = await fetch("/api/profile", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "X-Edit-Password": passwordInput.value
            },
            body: JSON.stringify(profile)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "保存失败。");
        }

        passwordInput.value = "";
        statusText.textContent = "保存成功！返回主页并刷新即可查看。";
    } catch (error) {
        statusText.textContent = error.message;
    } finally {
        saveButton.disabled = false;
    }
});

initialize();