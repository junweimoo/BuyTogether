import React, {useEffect, useState} from 'react';
import Cookies from 'js-cookie';
import { useNavigate } from 'react-router-dom';
import api from '../Api';

const HomePage = () => {
    const [newRoomName, setNewRoomName] = useState('');
    const [newRoomID, setnewRoomID] = useState('');
    const [newUsername, setNewUsername] = useState('');

    const [loggedUsername, setLoggedUsername] = useState('');
    const [loggedUserId, setLoggedUserId] = useState('');
    const [rooms, setRooms] = useState([]);

    const [joinRoomError, setJoinRoomError] = useState('');
    const [createRoomError, setCreateRoomError] = useState('');
    const [leaveRoomError, setLeaveRoomError] = useState('');
    const [registerUserError, setRegisterUserError] = useState('');
    
    const navigate = useNavigate();

    useEffect(() => {
        const sessionUser = Cookies.get('session_user');
        if (sessionUser) {
            const parsedUser = JSON.parse(sessionUser);
            setLoggedUsername(parsedUser.username);
            setLoggedUserId(parsedUser.userId);
        }
    }, []);

    useEffect(() => {
        if (loggedUserId !== '') {
            api.get(`/users/${loggedUserId}`)
                .then((response) => {
                    const userRooms = response.data.rooms;
                    setRooms(userRooms);
                }).catch(error => {
                    console.error('Error retrieving user info:', error);
                });
        }
    }, [loggedUserId])

    const handleCreateRoom = () => {
        api.post('/rooms', { userID: loggedUserId, roomName: newRoomName })
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
        api.post(`/rooms/${id.trim()}`, { id: loggedUserId, name: loggedUsername })
            .then(response => {
                const newRoomID = response.data.id;
                navigate(`/room/${id.trim()}`);
            })
            .catch(error => {
                console.error('Error joining room:', error);
                setJoinRoomError(error.response.data);
            });
    };

    const handleLeaveRoom = (id) => {
        api.post(`/rooms/${id.trim()}/leave`, { id: loggedUserId, name: loggedUsername })
            .then(response => {
                setRooms(rooms.filter((room) => room.id !== id));
            })
            .catch(error => {
                console.error('Error joining room:', error);
                setLeaveRoomError(error.response.data);
            });
    }

    const handleCreateUser = () => {
        if (newUsername.trim()) {
            api.post('/users', { name: newUsername })
                .then(response => {
                    setLoggedUsername(response.data.user.name);
                    setLoggedUserId(response.data.user.id);
                    setNewUsername("");

                    Cookies.set('session_user', JSON.stringify({
                        userId: response.data.user.id,
                        username: response.data.user.name
                    }), { expires: 1 }); // Cookie will expire in 1 day
                })
                .catch(error => {
                    console.error('Error creating user:', error);
                    setRegisterUserError(error.response.data);
                })
        }
    }

    return (
        <div>
            <h1>Welcome to BuyTogether</h1>
            <div>
                <h3>Logged in user:</h3>
                <div>{loggedUsername}</div>
                <div>{loggedUserId}</div>
                <h4>Rooms:</h4>
                <ul>
                    {rooms.map((room) => (
                        <li key={room.id}>
                            {room.name}
                            {" "}
                            ({room.id})
                            {" "}
                            <button onClick={() => handleJoinRoom(room.id)}>Enter</button>
                            <button onClick={() => handleLeaveRoom(room.id)}>Leave</button>
                        </li>
                    ))}
                </ul>
            </div>
            <br/>
            <div>
                <h3>Login / register</h3>
                <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="Enter Username"
                />
                <button onClick={handleCreateUser}>Login</button>
            </div>
            <br/>
            <div>
                <h3>Join / create room</h3>
                <div>
                    <input
                        type="text"
                        value={newRoomName}
                        onChange={(e) => setNewRoomName(e.target.value)}
                        placeholder="New Room Name"
                    />
                    <button onClick={handleCreateRoom}>Create a New Room</button>
                </div>
                {createRoomError && <div>{createRoomError}</div>}
                <br/>
                <input
                    type="text"
                    value={newRoomID}
                    onChange={(e) => setnewRoomID(e.target.value)}
                    placeholder="Enter Room ID"
                />
                <button onClick={() => handleJoinRoom(newRoomID)}>Join Room</button>
                {joinRoomError !== '' && <div>{joinRoomError}</div>}
            </div>
        </div>
    );
};

export default HomePage;
