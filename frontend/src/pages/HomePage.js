import React, {useEffect, useState} from 'react';
import Cookies from 'js-cookie';
import { useNavigate } from 'react-router-dom';
import api from '../Api';

const HomePage = () => {
    const [newRoomName, setNewRoomName] = useState('');
    const [newRoomID, setnewRoomID] = useState('');

    const [showRegister, setShowRegister] = useState(false);

    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [registerUserError, setRegisterUserError] = useState('');

    const [loginUsername, setLoginUsername] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginUserError, setLoginUserError] = useState('');

    const [loggedUsername, setLoggedUsername] = useState('');
    const [loggedUserId, setLoggedUserId] = useState('');
    const [loggedJWT, setLoggedJWT] = useState('');
    const [rooms, setRooms] = useState([]);

    const [joinRoomError, setJoinRoomError] = useState('');
    const [createRoomError, setCreateRoomError] = useState('');
    const [leaveRoomError, setLeaveRoomError] = useState('');
    
    const navigate = useNavigate();

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
            api.post('/users/register', { name: newUsername, password_hash: newPassword })
                .then(response => {
                    setNewUsername("");
                    setNewPassword("");
                    setRegisterUserError(response.data.message);
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
                    setLoginUserError(response.data.message);

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
        <div>
            <h1>Welcome to BuyTogether</h1>
            {loggedJWT
                ? <div>
                    <h3>Logged in user:</h3>
                    <div>{loggedUsername}</div>
                    <div>{loggedUserId}</div>
                    <button onClick={handleLogout}>Logout</button>
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
                : <div>
                    <h3>Not logged in</h3>
                </div>
            }
            <br/>
            <div>
                <button onClick={() => setShowRegister(!showRegister)}>
                    {showRegister ? "Login instead" : "Register instead"}
                </button>
            </div>
            {showRegister
                ?
                <div>
                    <h3>Register</h3>
                    <input
                        type="text"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="Enter Username"
                    />
                    <input
                        type="text"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter Password"
                    />
                    <button onClick={handleRegisterUser}>Register</button>
                    {registerUserError !== '' && <div>{registerUserError}</div>}
                </div>
                :
                <div>
                    <h3>Login</h3>
                    <input
                        type="text"
                        value={loginUsername}
                        onChange={(e) => setLoginUsername(e.target.value)}
                        placeholder="Enter Username"
                    />
                    <input
                        type="text"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Enter Password"
                    />
                    <button onClick={handleLoginUser}>Login</button>
                    {loginUserError !== '' && <div>{loginUserError}</div>}
                </div>
            }
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
