import React, {useEffect, useState} from 'react';
import Cookies from 'js-cookie';
import { useNavigate } from 'react-router-dom';
import { FaRegClipboard } from 'react-icons/fa';
import api from '../Api';
import * as PropTypes from "prop-types";

const createRoomErrorMap = new Map([
    ["INVALID_NAME_LENGTH", "Please use a name between 5 and 20 characters long."],
]);
const joinRoomErrorMap = new Map([
    ["ROOM_NOT_FOUND", "A room with this ID does not exist."],
]);
const defaultErrMsg = "A system error has occurred. Please try again later.";

function CenteredAlert(props) {
    if (!props.isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-2/3 max-w-md text-center">
                <h2 className="text-xl font-semib`old mb-4">Alert</h2>
                <p className="mb-6">{props.message}</p>
                <div className="items-center space-x-4">
                    <button
                        onClick={props.onCancel}
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={props.onClose}
                        className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
}

CenteredAlert.propTypes = {
    message: PropTypes.string,
    isOpen: PropTypes.bool,
    onClose: PropTypes.func,
    onClose1: PropTypes.func,
}

const HomePage = () => {
    const [newRoomName, setNewRoomName] = useState('');
    const [newRoomID, setnewRoomID] = useState('');

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
    const minWidth = 340;

    const [isDialogOpen, setDialogOpen] = useState(false);
    const [dialogMsg, setDialogMsg] = useState('');
    const [dialogCloseFn, setDialogCloseFn] = useState(() => {});
    
    const navigate = useNavigate();

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        setWindowWidth(window.innerWidth);
        return () => window.removeEventListener('resize', handleResize);
    }, [])

    useEffect(() => {
        const sessionUser = Cookies.get('session_user');
        if (sessionUser) {
            try {
                const parsedUser = JSON.parse(sessionUser);
                setLoggedUsername(parsedUser.username);
                setLoggedUserId(parsedUser.userId);
                setLoggedJWT(parsedUser.jwt);

                if (!parsedUser.jwt) {
                    navigate('/login');
                }

                api.get(`/users/${parsedUser.userId}`, { headers: { Authorization: `Bearer ${parsedUser.jwt}` }})
                    .then((response) => {
                        const userRooms = response.data.rooms;
                        setRooms(userRooms);
                    }).catch(error => {
                        if (!error.response || !error.response.data) {
                            setGlobalError(defaultErrMsg);
                        } else {
                            setGlobalError(error.response.data);
                            console.error('Error retrieving user info:', error);
                            navigate("/login");
                        }
                    }
                );
            } catch (e) {
                navigate("/login");
            }
        } else {
            navigate("/login");
        }
    }, [navigate]);

    const handleCreateRoom = () => {
        // frontend validation
        if (!newRoomName.trim()) {
            return;
        }

        var hasError;
        if (newRoomName.trim().length > 20 || newRoomName.trim().length < 5) {
            setCreateRoomError("Please use a name between 5 and 20 characters long.");
            hasError = true;
        }
        if (hasError) return;

        api.post('/rooms',
                { roomName: newRoomName },
                { headers: { Authorization: `Bearer ${loggedJWT}` } })
            .then(response => {
                const newRoomID = response.data.id;
                navigate(`/room/${newRoomID}`);
            })
            .catch(error => {
                console.error('Error creating room:', error);
                if (!error.response.data) {
                    setCreateRoomError(defaultErrMsg);
                } else {
                    const errMsg = createRoomErrorMap.get(error.response.data.trim()) || defaultErrMsg;
                    setCreateRoomError(errMsg);
                }
            });
    };

    const handleJoinRoom = (id) => {
        if (!newRoomID.trim()) {
            return;
        }

        api.post(`/rooms/${id.trim()}`,
                undefined,
                {headers: { Authorization: `Bearer ${loggedJWT}` }})
            .then(response => {
                const newRoomID = response.data.id;
                navigate(`/room/${newRoomID.trim()}`);
            })
            .catch(error => {
                console.error('Error joining room:', error);
                if (!error.response.data) {
                    setJoinRoomError(defaultErrMsg);
                } else {
                    const errMsg = joinRoomErrorMap.get(error.response.data.trim()) || defaultErrMsg;
                    setJoinRoomError(errMsg);
                }
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
                if (!error.response.data) {
                    setLeaveRoomError(defaultErrMsg);
                } else {
                    setLeaveRoomError(error.response.data);
                }
            });
    }

    const handleLogout = () => {
        Cookies.remove('session_user');
        setLoggedUserId('');
        setLoggedUsername('');
        setLoggedJWT('');
        navigate("/login");
    }

    function getRoomTile(room) {
        return <li
            key={room.id}
            className="border border-gray-300 rounded p-4 flex justify-between items-center shadow-md hover:shadow-lg transition-shadow duration-300">
            <div className="space-y-1 flex-col">
                <div className="text-bold space-x-2">
                    <span className="font-bold">{room.name}</span>
                </div>
                <div className="text-gray-500 text-sm">({room.id})</div>
            </div>
            <div className={windowWidth > thresholdWidth ? "ml-auto space-x-3" : "space-y-3 ml-auto flex flex-col"}>
                <button
                    className="text-sm bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded transition-colors duration-300"
                    onClick={() => navigate(`/room/${room.id}`)}
                >
                    Enter
                </button>
                <button
                    className="text-sm bg-red-400 hover:bg-red-700 text-white font-bold py-1 px-3 rounded transition-colors duration-300"
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
            ;
    }

    return (
        <div className="min-h-screen bg-gray-100" style={{minWidth: `${minWidth}px`}}>
            {/* Top Bar */}
            <div className="bg-blue-600 text-white flex justify-between items-center px-6 h-12">
                <div className="text-xl font-semibold">
                    {windowWidth > thresholdWidth ? "BuyTogether" : "BT"}
                </div>
                <div className="ml-auto flex items-center space-x-3">
                    <div>
                        {windowWidth > thresholdWidth && "Logged in as:"}
                        <span className="ml-1 font-bold">{loggedUsername}</span>
                    </div>
                    <button
                        className="bg-red-500 hover:bg-red-700 text-sm text-white font-bold py-1 px-2 rounded"
                        onClick={handleLogout}
                    >
                        Logout
                    </button>
                </div>
            </div>

            {/* Main section */}
            <div className="p-3">
                {(globalError !== "") && (
                    <div className="text-center">
                        {globalError}
                    </div>
                )}

                {/* Create / Join Room Section */}
                {(loggedJWT && globalError === "") &&(
                    <div className="p-6 bg-white shadow-md rounded w-full">
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
                {(loggedJWT && globalError === "") && (
                    <div className="p-3 bg-white shadow-md rounded mt-4 w-full">
                        <h4 className="text-xl font-bold mb-4">Rooms:</h4>
                        <ul className="space-y-4">
                            {rooms.map((room) => getRoomTile(room))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Confirmation dialog */}
            <CenteredAlert message={dialogMsg} isOpen={isDialogOpen} onClose={dialogCloseFn}
                           onCancel={() => setDialogOpen(false)}/>
        </div>
    );
};

export default HomePage;
