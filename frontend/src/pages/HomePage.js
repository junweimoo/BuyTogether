import React, {useEffect, useState} from 'react';
import Cookies from 'js-cookie';
import { useNavigate } from 'react-router-dom';
import { FaRegClipboard } from 'react-icons/fa';
import api from '../Api';

const HomePage = () => {
    const [newRoomName, setNewRoomName] = useState('');
    const [newRoomID, setnewRoomID] = useState('');

    const [showRegister, setShowRegister] = useState(false);

    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newPasswordSecond, setNewPasswordSecond] = useState('');
    const [registerUserError, setRegisterUserError] = useState('');
    const [registerUserSuccess, setRegisterUserSuccess] = useState('');

    const [loginUsername, setLoginUsername] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginUserError, setLoginUserError] = useState('');

    const [loggedUsername, setLoggedUsername] = useState('');
    const [loggedUserId, setLoggedUserId] = useState('');
    const [loggedJWT, setLoggedJWT] = useState('');
    const [rooms, setRooms] = useState([]);

    const [globalError, setGlobalError] = useState('');
    const [joinRoomError, setJoinRoomError] = useState('');
    const [createRoomError, setCreateRoomError] = useState('');
    const [leaveRoomError, setLeaveRoomError] = useState('');

    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const thresholdWidth = 650;
    const minWidth = 400;

    const [isDialogOpen, setDialogOpen] = useState(false);
    const [dialogMsg, setDialogMsg] = useState('');
    const [dialogCloseFn, setDialogCloseFn] = useState(() => {});
    
    const navigate = useNavigate();

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        setWindowWidth(window.innerWidth);

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const sessionUser = Cookies.get('session_user');
        if (sessionUser) {
            const parsedUser = JSON.parse(sessionUser);
            setLoggedUsername(parsedUser.username);
            setLoggedUserId(parsedUser.userId);
            setLoggedJWT(parsedUser.jwt);
        }
    }, []);

    useEffect(() => {
        if (loggedJWT === '' || loggedUserId === '') {
            setRooms([])
            return
        }
        api.get(`/users/${loggedUserId}`, { headers: { Authorization: `Bearer ${loggedJWT}` }})
            .then((response) => {
                const userRooms = response.data.rooms;
                setRooms(userRooms);
            }).catch(error => {
                setGlobalError(error.response.data);
                console.error('Error retrieving user info:', error);
        });
    }, [loggedJWT])

    const handleCreateRoom = () => {
        api.post('/rooms',
                { roomName: newRoomName },
                { headers: { Authorization: `Bearer ${loggedJWT}` } })
            .then(response => {
                const newRoomID = response.data.id;
                navigate(`/room/${newRoomID}`);
            })
            .catch(error => {
                console.error('Error creating room:', error);
                setCreateRoomError(error.response.data);
            });
    };

    const handleJoinRoom = (id) => {
        api.post(`/rooms/${id.trim()}`,
                undefined,
                {headers: { Authorization: `Bearer ${loggedJWT}` }})
            .then(response => {
                const newRoomID = response.data.id;
                navigate(`/room/${newRoomID.trim()}`);
            })
            .catch(error => {
                console.error('Error joining room:', error);
                setJoinRoomError(error.response.data);
            });
    };

    const handleLeaveRoom = (id) => {
        api.post(`/rooms/${id.trim()}/leave`,
                undefined,
                {headers: { Authorization: `Bearer ${loggedJWT}` }})
            .then(response => {
                setRooms(rooms.filter((room) => room.id !== id));
            })
            .catch(error => {
                console.error('Error joining room:', error);
                setLeaveRoomError(error.response.data);
            });
    }

    const handleRegisterUser = () => {
        if (newUsername.trim() && newPassword.trim()) {
            if (newPassword != newPasswordSecond) {
                setRegisterUserError('Your passwords did not match');
                return;
            }
            api.post('/users/register', { name: newUsername, password_hash: newPassword })
                .then(response => {
                    setNewUsername("");
                    setNewPassword("");
                    setNewPasswordSecond("");
                    setRegisterUserSuccess(true);
                    setRegisterUserError('');
                })
                .catch(error => {
                    console.error('Error while registering:', error);
                    setRegisterUserError(error.response.data);
                })
        }
    }

    const handleLoginUser = () => {
        if (loginUsername.trim() && loginPassword.trim()) {
            api.post('/users/login', { name: loginUsername, password_hash: loginPassword })
                .then(response => {
                    setLoggedUsername(response.data.user.name);
                    setLoggedUserId(response.data.user.id);
                    setLoggedJWT(response.data.token);

                    setLoginUsername("");
                    setLoginPassword("");
                    // setLoginUserError(response.data.message);

                    Cookies.set('session_user', JSON.stringify({
                        userId: response.data.user.id,
                        username: response.data.user.name,
                        jwt: response.data.token
                    }), { expires: 1 });
                })
                .catch(error => {
                    console.error('Error while logging in:', error);
                    setLoginUserError(error.response.data);
                })
        }
    }

    const handleLogout = () => {
        Cookies.remove('session_user');
        setLoggedUserId('');
        setLoggedUsername('');
        setLoggedJWT('');
    }

    return (
        <div className="min-h-screen bg-gray-100" style={{ minWidth: `${minWidth}px` }}>
            {/* Top Bar */}
            <div className="bg-blue-600 text-white flex justify-between items-center px-6 py-4">
                <div className="text-xl font-semibold">
                    {windowWidth > thresholdWidth ? "BuyTogether" : "BT"}
                </div>
                <div className="ml-auto flex items-center space-x-4">
                    {loggedJWT ? (
                        <>
                            <div>
                                {windowWidth > thresholdWidth && "Logged in as:"}
                                <span className="ml-1 font-bold">{loggedUsername}</span>
                            </div>
                            <div>
                                <button
                                    className="bg-blue-500 hover:bg-blue-700 text-white items-center font-bold py-1 px-2 rounded"
                                    onClick={() => navigator.clipboard.writeText(loggedUserId)}
                                >
                                    {windowWidth > thresholdWidth
                                        ? "Copy ID"
                                        : "Copy ID"
                                    }
                                </button>
                            </div>
                            <button
                                className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded"
                                onClick={handleLogout}
                            >
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded"
                                onClick={() => setShowRegister(!showRegister)}
                            >
                                {showRegister ? "Login" : "Register"}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Login / Register Form */}
            {!loggedJWT && (
                <div className="p-6 bg-white shadow-md rounded mt-4 mx-auto w-full max-w-md">
                    {showRegister ? (
                        <div>
                            <h3 className="text-2xl font-bold mb-4">Register</h3>
                            <input
                                type="text"
                                className="border rounded w-full p-2 mb-4"
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                                placeholder="Enter Username"
                            />
                            <input
                                type="password"
                                className="border rounded w-full p-2 mb-4"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter Password"
                            />
                            <input
                                type="password"
                                className="border rounded w-full p-2 mb-4"
                                value={newPasswordSecond}
                                onChange={(e) => setNewPasswordSecond(e.target.value)}
                                placeholder="Confirm Password"
                            />
                            <button
                                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded w-full"
                                onClick={handleRegisterUser}
                            >
                                Register
                            </button>
                            {registerUserError && <div className="text-red-500 mt-2">{registerUserError}</div>}
                            {registerUserSuccess && <div
                                className="text-green-600 mt-2">Account created! You may now <span
                                className="text-blue-500" onClick={() => setShowRegister(false)}>login</span>.
                            </div>}
                        </div>
                    ) : (
                        <div>
                            <h3 className="text-2xl font-bold mb-4">Login</h3>
                            <input
                                type="text"
                                className="border rounded w-full p-2 mb-4"
                                value={loginUsername}
                                onChange={(e) => setLoginUsername(e.target.value)}
                                placeholder="Enter Username"
                            />
                            <input
                                type="password"
                                className="border rounded w-full p-2 mb-4"
                                value={loginPassword}
                                onChange={(e) => setLoginPassword(e.target.value)}
                                placeholder="Enter Password"
                            />
                            <button
                                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full"
                                onClick={handleLoginUser}
                            >
                                Login
                            </button>
                            {loginUserError && <div className="text-red-500 mt-2">{loginUserError}</div>}
                        </div>
                    )}
                </div>
            )}

            {/* Main section */}
            <div className="p-6">
                {/* Create / Join Room Section */}
                {loggedJWT && (
                    <div className="p-6 bg-white shadow-md rounded mt-4 w-full">
                        <h3 className="text-2xl font-bold mb-4">Join / Create Room</h3>
                        <div className="mb-4">
                            <input
                                type="text"
                                className="border rounded w-full p-2 mb-4"
                                value={newRoomName}
                                onChange={(e) => setNewRoomName(e.target.value)}
                                placeholder="New Room Name"
                            />
                            <button
                                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded w-full"
                                onClick={handleCreateRoom}
                            >
                                Create a New Room
                            </button>
                            {createRoomError && <div className="text-red-500 mt-2">{createRoomError}</div>}
                        </div>
                        <div className="mb-4">
                            <input
                                type="text"
                                className="border rounded w-full p-2 mb-4"
                                value={newRoomID}
                                onChange={(e) => setnewRoomID(e.target.value)}
                                placeholder="Enter Room ID"
                            />
                            <button
                                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full"
                                onClick={() => handleJoinRoom(newRoomID)}
                            >
                                Join Room
                            </button>
                            {joinRoomError && <div className="text-red-500 mt-2">{joinRoomError}</div>}
                        </div>
                    </div>
                )}

                {/* Rooms List */}
                {loggedJWT && (
                    <div className="p-6 bg-white shadow-md rounded mt-4 w-full">
                        <h4 className="text-xl font-bold mb-4">Rooms:</h4>
                        <ul className="space-y-4">
                            {rooms.map((room) => (
                                <li key={room.id} className="border rounded p-4 flex justify-between items-center">
                                    <div className="space-y-1 flex-col">
                                        <div className="text-bold">{room.name}</div>
                                        <div className="text-gray-500">({room.id})</div>
                                    </div>
                                    <div className={windowWidth > thresholdWidth ? "ml-auto space-x-2" : "space-y-2 ml-auto flex flex-col"} >
                                        <button
                                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded"
                                            onClick={() => handleJoinRoom(room.id)}
                                        >
                                            Enter
                                        </button>
                                        <button
                                            className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded"
                                            // onClick={() => handleLeaveRoom(room.id)}
                                            onClick={() => {
                                                setDialogMsg("Are you sure you want to leave?");
                                                setDialogCloseFn(() => () => {
                                                    setDialogOpen(false);
                                                    handleLeaveRoom(room.id);
                                                });
                                                setDialogOpen(true);
                                            }}
                                        >
                                            Leave
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Confirmation dialog */}
            <CenteredAlert message={dialogMsg} isOpen={isDialogOpen} onClose={dialogCloseFn} onCancel={() => setDialogOpen(false)} />
        </div>
    );
};

const CenteredAlert = ({ message, isOpen, onClose, onCancel }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-2/3 max-w-md text-center">
                <h2 className="text-xl font-semibold mb-4">Alert</h2>
                <p className="mb-6">{message}</p>
                <div className="items-center space-x-4">
                    <button
                        onClick={onCancel}
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onClose}
                        className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HomePage;
