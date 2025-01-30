import React, { useEffect, useState } from "react";
import uitoolkit from "@zoom/videosdk-ui-toolkit";
import ZoomVideo from "@zoom/videosdk";

import "@zoom/videosdk-ui-toolkit/dist/videosdk-ui-toolkit.css";

function App() {
  const [username, setUsername] = useState("");
  const [roomName, setRoomName] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState("");
  let sessionContainer = null;
  let client = ZoomVideo.createClient();

  // const authEndpoint = "http://localhost:4000";
  const authEndpoint = "http://192.168.10.13:7010/api/1.0.0";

  // extend meetigns state
  const [meetingExtended, setMeetingExtended] = useState(false);
  const [extensionTime, setExtensionTime] = useState(10); // Default 10 mins
  const [showModal, setShowModal] = useState(false);

  // meeting timer
  const [meetingStarted, setMeetingStarted] = useState(false);
  const [meetingTimeLeft, setMeetingTimeLeft] = useState(60); // 1 hour in seconds

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordedFiles, setRecordedFiles] = useState([]);

  const [temp, setTemp] = useState({
    currentStartTime: 0,
    currentExpirationTime: 0,
  });

  useEffect(() => {
    if (meetingStarted && meetingTimeLeft > 0) {
      const timer = setInterval(() => {
        setMeetingTimeLeft((prev) => prev - 1);
      }, 1000);

      return () => clearInterval(timer); // Cleanup timer on unmount
    } else {
      closeMeeting(); // Auto-close meeting when timer reaches zero
    }
  }, [meetingStarted, meetingTimeLeft]);

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0"
    )}`;
  };

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
    options: {
      init: {},
      audio: {},
      video: {},
      share: {},
      recording: {},
      settings: {},
    },
    virtualBackground: {
      allowVirtualBackground: true,
      allowVirtualBackgroundUpload: true,
      virtualBackgrounds: [
        "https://images.unsplash.com/photo-1715490187538-30a365fa05bd?q=80&w=1945&auto=format&fit=crop",
      ],
    },
  };

  useEffect(() => {
    const initializeMeet = async () => {
      await client.init("en-US", "Global", {
        patchJsMedia: true,
        stayAwake: true,
        leaveOnPageUnload: true,
      });
    };

    if (isHost) {
      initializeMeet();
    }
  }, [isHost]);

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
      fetch(`${authEndpoint}/zoom/generate-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionName: roomName,
          role: isHost ? 1 : 0,
          // cloudRecordingOption: 1, // 1 for multiple file, 0 for single file
          // cloudRecordingElection: 1,
        }),
      })
        .then((response) => {
          return response.json();
        })
        .then((data) => {
          if (data.signature) {
            console.log(data);
            setTemp({
              currentExpirationTime: data.exp,
              currentStartTime: data?.iat,
            });

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
        client.join(
          roomName,
          config.videoSDKJWT,
          username,
          config.sessionPasscode
        );

        // ✅ Start the timer when meeting begins
        setMeetingStarted(true);
      }
    }

    const sessionClosed = () => {
      console.log("session closed");
      // call an api for meeting close

      sessionContainer && uitoolkit.closeSession(sessionContainer);

      // ✅ Reset timer and state when meeting ends
      setMeetingStarted(false);
      setMeetingTimeLeft(60); // Reset to 1 hour

      const joinFlowElement = document.getElementById("join-flow");
      if (joinFlowElement) {
        joinFlowElement.style.display = "block";
      }
    };
  }

  const extendMeeting = async () => {
    try {
      const response = await fetch(`${authEndpoint}/zoom/extend-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionName: roomName,
          role: isHost ? 1 : 0,
          extendMinute: extensionTime,
          currentStartTime: temp.currentStartTime,
          currentExpirationTime: temp.currentExpirationTime,
        }),
      });

      const data = await response.json();
      if (data.signature) {
        console.log("Meeting Extended", data.signature);

        config.videoSDKJWT = data.signature;
        // uitoolkit.updateSession(config); // Update session with new JWT

        // ✅ Add extra time to the countdown
        setMeetingTimeLeft((prev) => prev + extensionTime * 60);

        setMeetingExtended(true);
        setShowModal(false); // Close modal after extending
      } else {
        console.error("Failed to extend meeting");
      }
    } catch (error) {
      console.error("Error extending meeting:", error);
      // Temporarily add extra time
      // setMeetingTimeLeft((prev) => prev + extensionTime * 60);
      setShowModal(false);
    }
  };

  // Close meeting after time is exceed.
  const closeMeeting = () => {
    console.log("Meeting time is up. Closing session...");

    const sessionContainer = document.getElementById("sessionContainer");

    if (sessionContainer) {
      uitoolkit.closeSession(sessionContainer); // Close Zoom session
    }

    // ✅ Reset timer and state when meeting ends
    setMeetingStarted(false);
    setMeetingTimeLeft(60); // Reset to 1 hour

    // Show the join UI again
    const joinFlowElement = document.getElementById("join-flow");
    if (joinFlowElement) {
      joinFlowElement.style.display = "block";
    }
  };

  // Recording Functions
  const startRecording = async () => {
    console.log("hi");

    try {
      const cloudRecording = client.getRecordingClient();
      await cloudRecording.startCloudRecording();
      setIsRecording(true);
      console.log("✅ Recording Started...");
    } catch (error) {
      console.error("❌ Error starting recording:", error);
    }
  };

  const stopRecording = async () => {
    if (!sessionContainer) return;
    try {
      const files = await uitoolkit.stopRecording(sessionContainer);
      setIsRecording(false);
      setRecordedFiles(files);
      console.log("✅ Recording Stopped. Files saved:", files);
    } catch (error) {
      console.error("❌ Error stopping recording:", error);
    }
  };

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

      {/* <div className="w-[664px] h-[500px]">
        <div id="sessionContainer" className="w-full relative"></div>
      </div> */}
      <div className="w-[664px] h-[500px] relative">
        <div id="sessionContainer" className="w-full h-full relative">
          {/* Extend Meeting Button */}
        </div>
        {isHost && meetingStarted && (
          <div className="absolute top-10 right-4 z-10">
            <button
              className="bg-blue-500 text-white py-2 px-4 rounded-md text-xs"
              onClick={() => setShowModal(true)}
            >
              Extend Meeting
            </button>

            <div className="bg-gray-700 text-white px-4 py-2 rounded-md mt-1 text-xs">
              Time Left: {formatTime(meetingTimeLeft)}
            </div>

            <button
              className="bg-red-500 text-white py-2 px-4 rounded-md text-xs"
              onClick={isRecording ? stopRecording : startRecording}
            >
              {isRecording ? "Stop Recording" : "Start Recording"}
            </button>
          </div>
        )}

        {/* Modal for Selecting Time */}
        {showModal && (
          <div className="fixed inset-0 flex items-center justify-center ">
            <div className="bg-white p-5 rounded-lg shadow-lg">
              <h2 className="text-lg font-bold">Extend Meeting</h2>
              <label className="block mt-3">
                Enter extension time (minutes):
              </label>
              <input
                type="number"
                value={extensionTime}
                onChange={(e) => setExtensionTime(Number(e.target.value))}
                min="5"
                className="border p-2 w-full rounded-md"
              />

              <div className="flex justify-end mt-4">
                <button
                  className="bg-gray-500 text-white px-4 py-2 rounded-md mr-2"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="bg-green-500 text-white px-4 py-2 rounded-md"
                  onClick={extendMeeting}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
