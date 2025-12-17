function login() {
    const user = document.getElementById("username").value;
    const pass = document.getElementById("password").value;

    if (user === "student" && pass === "1234") {
        window.location.href = "index.html";
    } else {
        document.getElementById("error").innerText = "Invalid login!";
    }
}

/* COURSE ADD LOGIC */
function addCourse(button) {

    const course = button.parentElement;
    const name = course.dataset.name;
    const time = course.dataset.time;

    const schedule = document.getElementById("schedule");
    const items = schedule.querySelectorAll("li");

    for (let item of items) {
        if (item.dataset.time === time) {
            alert("Schedule conflict detected!");
            return;
        }
    }

    const li = document.createElement("li");
    li.textContent = name + " (" + time + ")";
    li.dataset.time = time;

    schedule.appendChild(li);
}