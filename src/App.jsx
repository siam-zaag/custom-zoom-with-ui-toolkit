import React, { useState } from "react";
import uitoolkit from "@zoom/videosdk-ui-toolkit";
import "@zoom/videosdk-ui-toolkit/dist/videosdk-ui-toolkit.css";

function App() {
  const [username, setUsername] = useState("");
  const [roomName, setRoomName] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState("");
  let sessionContainer = null;
  // const authEndpoint = "http://localhost:4000";
  const authEndpoint = "http://localhost:4000";

  const config = {
    videoSDKJWT: "",
    sessionName: "",
    userName: "",
    sessionPasscode: "123",
    features: [
      "preview",
      "video",
      "audio",
      "settings",
      "recording",
      "users",
      "chat",
      "share",
    ],
    options: { init: {}, audio: {}, video: {}, share: {} },
    virtualBackground: {
      allowVirtualBackground: true,
      allowVirtualBackgroundUpload: true,
      virtualBackgrounds: [
        "https://images.unsplash.com/photo-1715490187538-30a365fa05bd?q=80&w=1945&auto=format&fit=crop",
      ],
    },
  };

  function getVideoSDKJWT(e) {
    e.preventDefault();
    sessionContainer = document.getElementById("sessionContainer");
    config.userName = username;
    config.sessionName = roomName;
    if (sessionContainer instanceof HTMLDivElement) {
      const joinFlowElement = document.getElementById("join-flow");
      if (joinFlowElement) {
        joinFlowElement.style.display = "none";
      }
      fetch(authEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionName: roomName,
          role: isHost ? 1 : 0,
        }),
      })
        .then((response) => {
          return response.json();
        })
        .then((data) => {
          if (data.signature) {
            console.log(data.signature);
            config.videoSDKJWT = data.signature;
            joinSession();
          } else {
            console.log(data);
          }
        })
        .catch((error) => {
          console.log(error);
        });
    }

    function joinSession() {
      console.log(config);
      if (sessionContainer) {
        uitoolkit.joinSession(sessionContainer, config);
        sessionContainer && uitoolkit.onSessionClosed(sessionClosed);
      }
    }

    const sessionClosed = () => {
      console.log("session closed");
      sessionContainer && uitoolkit.closeSession(sessionContainer);
      const joinFlowElement = document.getElementById("join-flow");
      if (joinFlowElement) {
        joinFlowElement.style.display = "block";
      }
    };
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <div
        id="join-flow"
        className="flex flex-col items-center justify-center gap-5"
      >
        <h1 className="text-base md:text-2xl lg:text-3xl xl:text-4xl 2xl:text-5xl font-bold">
          Welcome to Sheba plus agent service
        </h1>
        <form
          method="post"
          className="flex flex-col gap-2"
          onSubmit={getVideoSDKJWT}
        >
          <label htmlFor="username">Name</label>
          <input
            type="text"
            name="username"
            id="username"
            className="border h-10 rounded-xl text-xl p-4"
            placeholder="Enter your name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <label htmlFor="roomName">Room Name</label>
          <input
            type="text"
            name="roomName"
            id="roomName"
            className="border h-10 rounded-xl text-xl p-4"
            placeholder="Enter the room name"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
          />

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              name="isHost"
              id="isHost"
              checked={isHost}
              onChange={(e) => setIsHost(e.target.checked)}
            />
            <label htmlFor="isHost">Join as a host</label>
          </div>

          {/* Display error message if fields are invalid */}
          {error && <p className="text-red-600">{error}</p>}

          <button
            className="bg-[#008a00] py-4 px-6 rounded-2xl text-white"
            type="submit"
            // onClick={getVideoSDKJWT}
          >
            Join Session
          </button>
        </form>
      </div>
      <div className="w-[664px] h-[500px]">
        <div id="sessionContainer" className="w-full"></div>
      </div>
    </div>
  );
}

export default App;
