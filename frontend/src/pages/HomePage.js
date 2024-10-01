import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../Api';

const HomePage = () => {
    const [roomID, setRoomID] = useState('');
    const navigate = useNavigate();

    // Function to create a new room
    const handleCreateRoom = () => {
        api.post('/rooms')
            .then(response => {
                const newRoomID = response.data.id;
                navigate(`/room/${newRoomID}`);
            })
            .catch(error => {
                console.error('Error creating room:', error);
            });
    };

    // Function to join an existing room
    const handleJoinRoom = () => {
        if (roomID.trim()) {
            navigate(`/room/${roomID.trim()}`);
        }
    };

    return (
        <div>
            <h1>Welcome to BuyTogether</h1>
            <div>
                <button onClick={handleCreateRoom}>Create a New Room</button>
            </div>
            <br />
            <div>
                <h3>Join an Existing Room</h3>
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
