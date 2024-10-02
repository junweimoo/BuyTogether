import React, { useEffect, useState } from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import api from '../Api';
import Cookies from "js-cookie";

const RoomPage = () => {
    const { roomID } = useParams();
    const [items, setItems] = useState([]);
    const [newItem, setNewItem] = useState('');
    const [users, setUsers] = useState([]);
    const [loggedUsername, setLoggedUsername] = useState('');
    const [loggedUserId, setLoggedUserId] = useState('');
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
        api.get(`/rooms/${roomID}/items`).then((response) => {
            setItems(response.data);
        });
        api.get(`/rooms/${roomID}/users`).then((response) => {
            setUsers(response.data);
        })
    }, [roomID]);

    const handleNewItem = () => {
        api.post(`/rooms/${roomID}/items`, { content: newItem }).then((response) => {
            setItems([...items, response.data]);
            setNewItem('');
        });
    };

    const handleDeleteItem = (itemId) => {
        api.delete(`/rooms/${roomID}/items/${itemId}`)
            .then(() => {
                setItems(items.filter((item) => item.id !== itemId));
            })
            .catch((error) => {
                console.error('Error deleting item:', error);
            });
    };

    const handleBackToHome = () => {
        navigate('/');
    }

    return (
        <div>
            <h1>Room {roomID}</h1>
            <div>
                <button onClick={handleBackToHome}>Back to home</button>
            </div>
            <div>
                <h3>Logged in user:</h3>
                <div>{loggedUsername}</div>
                <div>{loggedUserId}</div>
            </div>
            <div>
                <h3>Users: </h3>
                {users.map((user) => (
                    <li key={user.id}>
                        {user.name}
                        {user.id == loggedUserId && ' (me)'}
                    </li>
                ))}
            </div>
            <div>
                <h3>Items: </h3>
                <input
                    type="text"
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    placeholder="Add a new item"
                />
                <button onClick={handleNewItem}>Post</button>
            </div>
            <ul>
                {items.map((item) => (
                    <li key={item.id}>
                        {item.content}
                        <button onClick={() => handleDeleteItem(item.id)}>x</button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default RoomPage;
