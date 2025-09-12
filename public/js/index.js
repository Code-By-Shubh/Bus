currentLocation=document.getElementById("search-btn");
if(currentLocation){
  currentLocation.addEventListener("click", async (e) => {
  e.preventDefault();

    const start = document.getElementById("start-field").value;
    const end = document.getElementById("end-field").value;
    
  try {     
    const res = await axios.post("/findBus", {start,end });
    window.location.href="/map";
  } catch (err) {
    console.error("Error adding skill:", err);
  }
});
}

newSkillForm=document.getElementById("newSkillForm");
if(newSkillForm){
  newSkillForm.addEventListener("submit", async (e) => {
  e.preventDefault();

    const skillName = document.getElementById("skillName").value;
    const description = document.getElementById("description").value;
    const progress = document.getElementById("progress").value;
    const category = document.getElementById("category").value;
    const goal = document.getElementById("goal").value;
  try {     
    const res = await axios.post("newSkill", { skillName, description, progress, category, goal });
    window.location.href="/dashboard";
  } catch (err) {
    console.error("Error adding skill:", err);
  }
});
}

editForm=document.getElementById("editForm");
if(editForm){
  editForm.addEventListener("submit", async (e) => {
    btn=document.getElementById("updateButton");
  e.preventDefault();

    const id=btn.dataset.id;
    console.log(id);
    const skillName = document.getElementById("skillName").value;
    const description = document.getElementById("description").value;
    const progress = document.getElementById("progress").value;
    const category = document.getElementById("category").value;
    const goal = document.getElementById("goal").value;
  try {
    const res = await axios.patch(`/updateSkill/${id}`, { skillName, description, progress, category, goal });
    if(res.data.error){
      alert(res.data.error);
    }
    else{
      window.location.href = "/dashboard";
    }
  } catch (err) {
    console.error("Error updatinging skill:", err);
  }
});
}


const registerForm=document.getElementById("registerForm");
if(registerForm){
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const country = document.getElementById("country").value;
    const fullName = document.getElementById("fullName").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const body = { country, fullName, email, password };
    console.log("hello friend");
    try {
        const result = await axios.post("/registered", body);

        console.log(result.data);

        if (result.data.error === null) {
            // Redirect to dashboard or show success message
            window.location.href = "/dashboard"; // or any route you use
        } else {
            alert(result.data.error); // Show error returned from server
        }

    } catch (error) {
        alert("Something went wrong. Please try again.");
    }
});

}

const loginForm=document.getElementById("loginForm");
if(loginForm){
    loginForm.addEventListener("submit", async (event) => {
      console.log("akshara");
    event.preventDefault();



    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const body = { email, password };
    console.log("Hello friend");
    try {
        const result = await axios.post("/loggined", body);
        console.log(email);
        console.log(password);
        console.log(result.data);

        if (result.data.error === null) {
            // Redirect to dashboard or show success message
            window.location.href = "/dashboard"; // or any route you use
        } else {
            alert(result.data.error); // Show error returned from server
        }

    } catch (error) {
        alert("Something went wrong. Please try again.");
    }
});

}


    document.querySelectorAll('.chat-button').forEach(button => {
      button.addEventListener('click', async (e) => {
        e.preventDefault();
        const name = button.dataset.name;
        console.log("Shubh");
        try {
          const res = await axios.post("/chat",{mess:name});
          const data =  res.data;
          if (data.error) {
          alert("❌ " + data.error);
        } else {
          location.reload(); // Refresh the page to reflect changes
        }
        } catch (error) {
          alert('❌ Server error occured');
        }
        
        
      });
    });




  document.querySelectorAll('.delete-button').forEach(button => {
    button.addEventListener('click', async (e) => {
      e.preventDefault();
      const id = button.getAttribute('data-id');
      console.log("Shubh");
      const res = await fetch(`/delete/${id}`, {
        method: 'DELETE'
      });

      const data = await res.json();

      if (data.error) {
        alert("❌ " + data.error);
      } else {
        location.reload(); // Refresh the page to reflect changes
      }
    });
  });
