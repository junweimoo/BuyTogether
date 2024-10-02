import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../Api';

const HomePage = () => {
    const [roomID, setRoomID] = useState('');
    const [username, setUsername] = useState('');
    const [loggedUsername, setLoggedUsername] = useState('');
    const [loggedUserId, setLoggedUserId] = useState('');
    const navigate = useNavigate();

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
