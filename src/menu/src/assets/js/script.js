document.addEventListener('DOMContentLoaded', () => {
    console.log("中医药百科网站已加载");

    // 模拟导航切换
    const navItems = document.querySelectorAll('.nav-links a');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            navItems.forEach(i => i.classList.remove('active'));
            e.target.classList.add('active');
        });
    });

    // 中央面板点击反馈
    const mainPanel = document.getElementById('mainPanel');
    mainPanel.addEventListener('click', () => {
        alert("正在连接3D人体交互模型模块...");
    });
});