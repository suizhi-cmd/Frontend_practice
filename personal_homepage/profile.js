const profileLabels = {
  school: "学校",
  college: "学院",
  major: "专业",
  interests: "兴趣",
  learning: "正在学习",
  currentProject: "正在进行的项目",
  pastProjects: "做过的项目",
};

async function loadProfile() {
  const status = document.getElementById("profile-status");
  const details = document.getElementById("profile-details");

  try {
    const response = await fetch("/api/profile", {
      cache: "no-store",
    });

    if (!response.ok) throw new Error("读取失败");

    const profile = await response.json();

    details.replaceChildren();

    for (const [field, label] of Object.entries(profileLabels)) {
      if (!profile[field]) continue;

      const paragraph = document.createElement("p");
      const heading = document.createElement("strong");

      heading.textContent = `${label}：`;
      paragraph.append(heading, document.createTextNode(profile[field]));
      details.appendChild(paragraph);
    }

    status.textContent = "";
  } catch {
    status.textContent = "资料加载失败，请确认后端正在运行。";
  }
}

loadProfile();
