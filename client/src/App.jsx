import { useEffect, useState, createContext, useContext, useRef } from "react";
import {
  BrowserRouter as Router,
  Link,
  Routes,
  Route,
  Outlet,
  useParams,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { io } from "socket.io-client";
const API_URL = "http://localhost:5000";

const fetcher = async (url, options) => {
  try {
    const res = await fetch(url, {
      ...options,
      credentials: "include",
    });
    const data = await res.json();
    return data;
  } catch (error) {
    console.log(error);
  }
};

const authContext = createContext();

const useAuth = () => {
  const context = useContext(authContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};

// eslint-disable-next-line react/prop-types
const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <authContext.Provider value={{ isAuthenticated, setIsAuthenticated }}>
      {children}
    </authContext.Provider>
  );
};

function ProtectedLayout() {
  const { isAuthenticated } = useAuth();

  return (
    <>
      {!isAuthenticated ? (
        <Navigate to="/login" />
      ) : (
        <div className="bg-gray-100 h-screen">
          <div className="flex flex-row bg-gray-100 p-20 h-full">
            <Sidebar />
            <div className="flex flex-col flex-grow">
              <Outlet />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<ProtectedLayout />}>
            <Route path="/thread/:threadId" element={<Thread />} />
            <Route path="/thread/create" element={<CreateThread />} />
            <Route path="/thread/join" element={<JoinThread />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
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
      senderId: 1,
      timestamp: "2021-09-01T12:00:00Z",
    },
  ]);

  useEffect(() => {
    const socket = io("ws://localhost:5000", {
      withCredentials: true,
    });
    const abortController = new AbortController();
    // load old messages
    fetcher(`${API_URL}/threads/${threadId}/messages`, {
      signal: abortController.signal,
    }).then((res) => {
      if (res && res.data) {
        // setMessages(res.data);
        const messages = res.data.map((message) => ({
          ...message,
          timestamp: new Date(message.timestamp).toLocaleString(),
          sender: message.sender.username,
          senderId: message.sender.id,
        }));

        setMessages(messages);
      }
    });

    socket.on("connect", () => {
      socket.emit("join", threadId);

      socket.on("message", (message) => {
        console.log(message);

        if (message.type === "text") {
          const newmsg = {
            ...message,
            timestamp: new Date(message.timestamp).toLocaleString(),
            sender: message.sender.username,
            senderId: message.sender.id,
          };

          setMessages((messages) => [...messages, newmsg]);
        }
      });
    });

    return () => {
      abortController.abort();
      socket.disconnect();
    };
  }, [threadId]);

  const handleSendMessage = (e) => {
    const socket = io("ws://localhost:5000", {
      withCredentials: true,
    });

    e.preventDefault();
    const newMessageObj = {
      content: newMessage,
      timestamp: new Date().toISOString(),
      threadId,
    };

    if (newMessage === "") {
      alert("Please fill out all fields");
      return;
    }

    socket.emit("message", newMessageObj);

    setNewMessage("");
  };

  return (
    <div className="flex flex-col flex-grow">
      <h1 className="text-4xl font-bold mb-8">Thread {threadId}</h1>
      <div className="flex flex-col overflow-auto">
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
  const { setIsAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const auth = localStorage.getItem("isAuthenticated");
    if (auth) {
      navigate("/");
      setIsAuthenticated(true);
    }
  }, [navigate, setIsAuthenticated]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (username === "" || password === "") {
      alert("Please fill out all fields");
    }

    fetcher(`${API_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    }).then((res) => {
      if (res.data) {
        localStorage.setItem("isAuthenticated", true);
        setIsAuthenticated(true);
        navigate("/");
        alert("Successfully logged in!");
      } else {
        alert(res.message);
      }
    });
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

      <p className="mt-4">
        Don&apos;t have an account?{" "}
        <Link to="/register" className="text-blue-500">
          Register
        </Link>
      </p>
    </div>
  );
}

function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = (e) => {
    e.preventDefault();
    if (username === "" || password === "") {
      alert("Please fill out all fields");
    }

    fetcher(`${API_URL}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    })
      .then((res) => {
        if (res.success) {
          alert("Successfully registered!");
        } else {
          alert(res.message);
        }
      })
      .catch((err) => {
        console.log(err);
      });
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-4xl font-bold mb-8">Register</h1>
      <form className="flex flex-col w-64" onSubmit={handleRegister}>
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
          Register
        </button>
      </form>

      <p className="mt-4">
        Already have an account?{" "}
        <Link to="/login" className="text-blue-500">
          Login
        </Link>
      </p>
    </div>
  );
}

const Sidebar = () => {
  const { setIsAuthenticated, isAuthenticated } = useAuth();
  const [threads, setThreads] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetcher(`${API_URL}/threads`).then((res) => {
      if (!res.data) {
        alert(res.message);
        return;
      }
      setThreads(res.data);
    });
  }, []);

  return (
    <div className="flex flex-col w-64 bg-gray-200">
      <h1 className="text-2xl font-bold p-4">Threads</h1>
      {isAuthenticated && (
        <button
          className="p-4 hover:bg-gray-300"
          onClick={() => {
            localStorage.removeItem("isAuthenticated");
            setIsAuthenticated(false);
            navigate("/login");
          }}
        >
          Logout
        </button>
      )}
      <button
        className="p-4 hover:bg-gray-300"
        onClick={() => {
          navigate("/thread/create");
        }}
      >
        Create Thread
      </button>
      <button
        className="p-4 hover:bg-gray-300"
        onClick={() => {
          navigate("/thread/join");
        }}
      >
        Join Thread
      </button>
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

const CreateThread = () => {
  const [title, setTitle] = useState("");
  const [secret, setSecret] = useState("");
  const createThread = (e) => {
    e.preventDefault();
    if (title === "" || secret === "") {
      alert("Please fill out all fields");
    }

    fetcher(`${API_URL}/threads`, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        secret,
      }),
    }).then((res) => {
      if (res.data) {
        alert("Successfully created thread!");
      } else {
        alert(res.message);
      }
    });
  };

  return (
    <div className="flex flex-col flex-grow p-4">
      <h1 className="text-4xl font-bold mb-8">Create Thread</h1>
      <form className="flex flex-col w-64" onSubmit={createThread}>
        <input
          type="text"
          placeholder="Title"
          className="p-2 border border-gray-400 rounded mb-4"
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          type="text"
          placeholder="Secret"
          className="p-2 border border-gray-400 rounded mb-4"
          onChange={(e) => setSecret(e.target.value)}
        />
        <button type="submit" className="p-2 bg-blue-500 text-white rounded">
          Create
        </button>
      </form>
    </div>
  );
};

const JoinThread = () => {
  const [secret, setSecret] = useState("");
  const [threadId, setThreadId] = useState("");
  const navigate = useNavigate();

  const joinThread = (e) => {
    e.preventDefault();
    if (threadId === "" || secret === "") {
      alert("Please fill out all fields");
    }

    fetcher(`${API_URL}/threads/${threadId}/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        secret,
      }),
    }).then((res) => {
      if (res.data) {
        alert("Successfully joined thread!");
        navigate(`/thread/${threadId}`);
      } else {
        alert(res.message);
      }
    });
  };

  return (
    <div className="flex flex-col flex-grow p-4">
      <h1 className="text-4xl font-bold mb-8">Join Thread</h1>
      <form className="flex flex-col w-64" onSubmit={joinThread}>
        <input
          type="text"
          placeholder="Thread ID"
          className="p-2 border border-gray-400 rounded mb-4"
          onChange={(e) => setThreadId(e.target.value)}
        />
        <p className="mb-4">Ask the thread owner for the secret</p>
        <input
          type="text"
          placeholder="Secret"
          className="p-2 border border-gray-400 rounded mb-4"
          onChange={(e) => setSecret(e.target.value)}
        />
        <button type="submit" className="p-2 bg-blue-500 text-white rounded">
          Join
        </button>
      </form>
    </div>
  );
};

export default App;
