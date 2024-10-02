import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../Api';

const RoomPage = () => {
    const { roomID } = useParams();
    const [items, setItems] = useState([]);
    const [newItem, setNewItem] = useState('');
    const [users, setUsers] = useState([]);

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

    return (
        <div>
            <h1>Room {roomID}</h1>
            <div>
                <h3>Users: </h3>
                {users.map((user) => (
                    <li key={user.id}>
                        {user.name}
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
