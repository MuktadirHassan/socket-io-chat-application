import { useEffect } from "react";
import { useState } from "react";
import {
  BrowserRouter as Router,
  Link,
  Routes,
  Route,
  Outlet,
  useParams,
} from "react-router-dom";
import { io } from "socket.io-client";
const socket = io("ws://localhost:5001");

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ThreadLayout />}>
          <Route path="/thread/:threadId" element={<Thread />} />
        </Route>
      </Routes>
    </Router>
  );
}

function ThreadLayout() {
  return (
    <div className="bg-gray-100 h-screen">
      <div className="flex flex-row bg-gray-100 p-20 h-full">
        <Sidebar />
        <div className="flex flex-col flex-grow">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

function Thread() {
  const { threadId } = useParams();

  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      id: 1,
      content: "This is a message",
      sender: "John Doe",
      timestamp: "2021-09-01T12:00:00Z",
    },
    {
      id: 2,
      content: "This is another message",
      sender: "Jane Doe",
      timestamp: "2021-09-01T12:00:00Z",
    },
    {
      id: 3,
      content: "This is a third message",
      sender: "John Doe",
      timestamp: "2021-09-01T12:00:00Z",
    },
    {
      id: 4,
      content: "This is a fourth message",
      sender: "Jane Doe",
      timestamp: "2021-09-01T12:00:00Z",
    },
  ]);

  useEffect(() => {
    // client-side
    socket.on("connect", () => {
      socket.emit("join", threadId);
    });

    socket.on("disconnect", () => {
      console.log(socket.id); // undefined
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
    };
  }, [threadId]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    const newMessageObj = {
      id: messages.length + 1,
      content: newMessage,
      sender: "John Doe", // Assuming the sender is always the same for simplicity
      timestamp: new Date().toISOString(),
    };
    setMessages([...messages, newMessageObj]);
    setNewMessage("");
  };

  return (
    <div className="flex flex-col flex-grow">
      <h1 className="text-4xl font-bold mb-8">Thread {threadId}</h1>
      <div className="flex flex-col">
        {messages.map((message) => (
          <div key={message.id} className="bg-gray-200 p-2 mb-2">
            <p className="text-lg">{message.content}</p>
            <p className="text-sm text-gray-500">
              {message.sender} - {message.timestamp}
            </p>
          </div>
        ))}
      </div>
      <form onSubmit={handleSendMessage} className="mt-4">
        <input
          type="text"
          placeholder="Type your message..."
          className="p-2 border border-gray-400 rounded"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <button
          type="submit"
          className="p-2 bg-blue-500 text-white rounded mt-2"
        >
          Send
        </button>
      </form>
    </div>
  );
}

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-4xl font-bold mb-8">Login</h1>
      <form className="flex flex-col w-64" onSubmit={handleLogin}>
        <input
          type="text"
          placeholder="Username"
          className="p-2 border border-gray-400 rounded mb-4"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          className="p-2 border border-gray-400 rounded mb-4"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" className="p-2 bg-blue-500 text-white rounded">
          Login
        </button>
      </form>
    </div>
  );
}

const threads = [
  {
    id: 1,
    title: "CSE 310",
    description: "This is a thread for CSE 310",
  },
  {
    id: 2,
    title: "CSE 320",
    description: "This is a thread for CSE 320",
  },
  {
    id: 3,
    title: "CSE 330",
    description: "This is a thread for CSE 330",
  },
  {
    id: 4,
    title: "CSE 340",
    description: "This is a thread for CSE 340",
  },
  {
    id: 5,
    title: "CSE 350",
    description: "This is a thread for CSE 350",
  },
  {
    id: 6,
    title: "CSE 360",
    description: "This is a thread for CSE 360",
  },
  {
    id: 7,
    title: "CSE 370",
    description: "This is a thread for CSE 370",
  },
  {
    id: 8,
    title: "CSE 380",
    description: "This is a thread for CSE 380",
  },
  {
    id: 9,
    title: "CSE 390",
    description: "This is a thread for CSE 390",
  },
];

const Sidebar = () => {
  return (
    <div className="flex flex-col w-64 bg-gray-200">
      {threads.map((thread) => (
        <Link
          key={thread.id}
          to={`/thread/${thread.id}`}
          className="p-4 hover:bg-gray-300"
        >
          {thread.title}
        </Link>
      ))}
    </div>
  );
};

export default App;
