import React, {useEffect, useState} from 'react';
import Cookies from 'js-cookie';
import { useNavigate } from 'react-router-dom';
import api from '../Api';

const HomePage = () => {
    const [roomID, setRoomID] = useState('');
    const [username, setUsername] = useState('');
    const [loggedUsername, setLoggedUsername] = useState('');
    const [loggedUserId, setLoggedUserId] = useState('');
    const [rooms, setRooms] = useState([]);
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
        api.post('/rooms', { id: loggedUserId, name: loggedUsername })
            .then(response => {
                const newRoomID = response.data.id;
                navigate(`/room/${newRoomID}`);
            })
            .catch(error => {
                console.error('Error creating room:', error);
            });
    };

    const handleJoinRoom = () => {
        api.post(`/rooms/${roomID.trim()}`, { id: loggedUserId, name: loggedUsername })
            .then(response => {
                const newRoomID = response.data.id;
                navigate(`/room/${newRoomID}`);
            })
            .catch(error => {
                console.error('Error creating room:', error);
            });
        if (roomID.trim()) {
            navigate(`/room/${roomID.trim()}`);
        }
    };

    const handleCreateUser = () => {
        if (username.trim()) {
            api.post('/users', { name: username })
                .then(response => {
                    setLoggedUsername(response.data.user.name);
                    setLoggedUserId(response.data.user.id);
                    setUsername("");

                    Cookies.set('session_user', JSON.stringify({
                        userId: response.data.user.id,
                        username: response.data.user.name
                    }), { expires: 1 }); // Cookie will expire in 1 day
                })
                .catch(error => {
                    console.error('Error creating user:', error);
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
                        {room.id}
                    </li>
                ))}
                </ul>
            </div>
            <br/>
            <div>
                <h3>Login / register</h3>
                <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter Username"
                />
                <button onClick={handleCreateUser}>Login</button>
            </div>
            <br/>
            <div>
                <h3>Join / create room</h3>
                <div>
                    <button onClick={handleCreateRoom}>Create a New Room</button>
                </div>
                <br/>
                <input
                    type="text"
                    value={roomID}
                    onChange={(e) => setRoomID(e.target.value)}
                    placeholder="Enter Room ID"
                />
                <button onClick={handleJoinRoom}>Join Room</button>
            </div>
        </div>
    );
};

export default HomePage;
