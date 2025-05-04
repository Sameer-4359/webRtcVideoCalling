import React, { useEffect, useCallback, useState, useRef } from "react";
import ReactPlayer from "react-player";
import peer from "../service/peer";
import { useSocket } from "../context/SocketProvider";
import { FaPhone, FaPhoneSlash, FaVideo, FaVideoSlash, FaMicrophone, FaMicrophoneSlash, FaPaperPlane } from 'react-icons/fa';

import "./Room.css";

const RoomPage = () => {
  const socket = useSocket();
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState();
  const [remoteStream, setRemoteStream] = useState();
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef(null);
  const [isVideoOn, setIsVideoOn] = useState(true);
const [isAudioOn, setIsAudioOn] = useState(true);

  const handleUserJoined = useCallback(({ email, id }) => {
    console.log(`Email ${email} joined room`);
    setRemoteSocketId(id);
  }, []);

  const handleCallUser = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    const offer = await peer.getOffer();
    socket.emit("user:call", { to: remoteSocketId, offer });
    setMyStream(stream);
  }, [remoteSocketId, socket]);

  const handleIncommingCall = useCallback(
    async ({ from, offer }) => {
      setRemoteSocketId(from);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setMyStream(stream);
      console.log(`Incoming Call`, from, offer);
      const ans = await peer.getAnswer(offer);
      socket.emit("call:accepted", { to: from, ans });
    },
    [socket]
  );
  const toggleVideo = () => {
  if (myStream && myStream.getVideoTracks().length > 0) {
    const videoTrack = myStream.getVideoTracks()[0];
    videoTrack.enabled = !videoTrack.enabled;
    setIsVideoOn(videoTrack.enabled);
    
    // If turning off, also stop the track if we're not in a call
    if (!videoTrack.enabled && !remoteSocketId) {
      videoTrack.stop();
    }
  }
};

const toggleAudio = () => {
  if (myStream && myStream.getAudioTracks().length > 0) {
    const audioTrack = myStream.getAudioTracks()[0];
    audioTrack.enabled = !audioTrack.enabled;
    setIsAudioOn(audioTrack.enabled);
    
    if (!audioTrack.enabled && !remoteSocketId) {
      audioTrack.stop();
    }
  }
};

  const sendStreams = useCallback(() => {
    if (myStream) {
      for (const track of myStream.getTracks()) {
        peer.peer.addTrack(track, myStream);
      }
    }
  }, [myStream]);

  const handleCallAccepted = useCallback(
    ({ from, ans }) => {
      peer.setLocalDescription(ans);
      console.log("Call Accepted!");
      sendStreams();
    },
    [sendStreams]
  );

  const handleNegoNeeded = useCallback(async () => {
    const offer = await peer.getOffer();
    socket.emit("peer:nego:needed", { offer, to: remoteSocketId });
  }, [remoteSocketId, socket]);

  useEffect(() => {
    peer.peer.addEventListener("negotiationneeded", handleNegoNeeded);
    return () => {
      peer.peer.removeEventListener("negotiationneeded", handleNegoNeeded);
    };
  }, [handleNegoNeeded]);

  const handleNegoNeedIncomming = useCallback(
    async ({ from, offer }) => {
      const ans = await peer.getAnswer(offer);
      socket.emit("peer:nego:done", { to: from, ans });
    },
    [socket]
  );

  const handleNegoNeedFinal = useCallback(async ({ ans }) => {
    await peer.setLocalDescription(ans);
  }, []);

  useEffect(() => {
    peer.peer.addEventListener("track", async (ev) => {
      const remoteStream = ev.streams;
      console.log("GOT TRACKS!!");
      setRemoteStream(remoteStream[0]);
    });
  }, []);

  // const handleSendMessage = useCallback(() => {
  //   if (messageInput.trim() && remoteSocketId) {
  //     const room = window.location.pathname.split("/").pop();
  //     const email = "User"; // You might want to get this from context or props
  //     socket.emit("message:send", { room, message: messageInput, email });
  //     setMessages(prev => [...prev, { text: messageInput, sender: "You" }]);
  //     setMessageInput("");
  //   }
  // }, [messageInput, remoteSocketId, socket]);

  // const handleReceiveMessage = useCallback(({ message, email }) => {
  //   setMessages(prev => [...prev, { text: message, sender: email }]);
  // }, []);

  const handleSendMessage = useCallback(() => {
    if (messageInput.trim() && remoteSocketId) {
      const room = window.location.pathname.split("/").pop();
      const email = "User"; // You might want to get this from context or props
      socket.emit("message:send", { room, message: messageInput, email });
      setMessageInput("");
    }
  }, [messageInput, remoteSocketId, socket]);
  
  const handleReceiveMessage = useCallback(({ message, email }) => {
    setMessages(prev => [...prev, { text: message, sender: email }]);
  }, []);
  
  const handleEndCall = useCallback(() => {
    const room = window.location.pathname.split("/").pop();
    socket.emit("call:end", { room });
    
    // Stop all media tracks
    if (myStream) {
      myStream.getTracks().forEach(track => {
        track.stop(); // This will turn off the camera light
      });
    }
    
    // Clean up peer connection
    if (peer.peer) {
      peer.peer.close(); // Important to close the RTCPeerConnection
    }
  
    setMyStream(null);
    setRemoteStream(null);
    setRemoteSocketId(null);
  }, [myStream, socket]);

  const handleCallEnded = useCallback(() => {
    if (myStream) {
      myStream.getTracks().forEach(track => track.stop());
    }
    
    if (peer.peer) {
      peer.peer.close();
    }
  
    setMyStream(null);
    setRemoteStream(null);
    setRemoteSocketId(null);
  }, [myStream]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    socket.on("user:joined", handleUserJoined);
    socket.on("incomming:call", handleIncommingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("peer:nego:needed", handleNegoNeedIncomming);
    socket.on("peer:nego:final", handleNegoNeedFinal);
    socket.on("message:receive", handleReceiveMessage);
    socket.on("call:ended", handleCallEnded);

    return () => {
      socket.off("user:joined", handleUserJoined);
      socket.off("incomming:call", handleIncommingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("peer:nego:needed", handleNegoNeedIncomming);
      socket.off("peer:nego:final", handleNegoNeedFinal);
      socket.off("message:receive", handleReceiveMessage);
      socket.off("call:ended", handleCallEnded);
    };
  }, [
    socket,
    handleUserJoined,
    handleIncommingCall,
    handleCallAccepted,
    handleNegoNeedIncomming,
    handleNegoNeedFinal,
    handleReceiveMessage,
    handleCallEnded,
  ]);

  return (
    <div className="room-container">
    <div className="video-section">
      <div className="video-header">
        <h2>Room: {window.location.pathname.split("/").pop()}</h2>
        <div>{remoteSocketId ? "Connected" : "Waiting for others..."}</div>
      </div>
      
      <div className="video-content">
        {myStream && (
          <div className="video-box">
            <ReactPlayer
              playing
              muted
              height="100%"
              width="100%"
              url={myStream}
            />
            <div className="video-label">You</div>
          </div>
        )}
        
        {remoteStream ? (
          <div className="video-box">
            <ReactPlayer
              playing
              muted={false}
              height="100%"
              width="100%"
              url={remoteStream}
            />
            <div className="video-label">Participant</div>
          </div>
        ) : (
          <div className="video-box" style={{background: '#1a202c', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <div style={{color: 'white', textAlign: 'center'}}>
              Waiting for participant to join...
            </div>
          </div>
        )}
      </div>
      
      <div className="controls">
        <button 
          className={`control-button ${isAudioOn ? 'active' : ''}`}
          onClick={toggleAudio}
        >
          {isAudioOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
        </button>
        
        <button 
          className={`control-button ${isVideoOn ? 'active' : ''}`}
          onClick={toggleVideo}
        >
          {isVideoOn ? <FaVideo /> : <FaVideoSlash />}
        </button>
        
        {remoteSocketId && (
          <button 
            className="control-button call-button"
            onClick={handleCallUser}
          >
            <FaPhone />
          </button>
        )}
        
        {(myStream || remoteStream) && (
          <button 
            className="control-button end-call"
            onClick={handleEndCall}
          >
            <FaPhoneSlash />
          </button>
        )}
      </div>
    </div>
    
    <div className="chat-section">
      <div className="chat-header">Chat</div>
      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div 
            key={index} 
            className={`chat-message ${msg.sender === 'You' ? 'self' : ''}`}
          >
            <div className="sender">{msg.sender}</div>
            <div className="text">{msg.text}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input-container">
        <div className="chat-input">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type a message..."
          />
          <button onClick={handleSendMessage}>
            <FaPaperPlane />
          </button>
        </div>
      </div>
    </div>
  </div>
  );
};

export default RoomPage;