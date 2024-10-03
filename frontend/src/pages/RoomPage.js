import React, { useEffect, useState } from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import api from '../Api';
import Cookies from "js-cookie";
import NotFoundPage from "./NotFoundPage";
import LoadingPage from "./LoadingPage";

const RoomPage = () => {
    const { roomID } = useParams();

    const [roomName, setRoomName] = useState('');
    const [items, setItems] = useState([]);
    const [users, setUsers] = useState([]);
    const [userMap, setUserMap] = useState(new Map());
    const [simplifiedItems, setSimplifiedItems] = useState([]);

    const [newItemName, setNewItemName] = useState('');
    const [newAmount, setNewAmount] = useState('');
    const [newFromUserID, setNewFromUserID] = useState('');
    const [newToUserID, setNewToUserID] = useState('');

    const [loggedUsername, setLoggedUsername] = useState('');
    const [loggedUserId, setLoggedUserId] = useState('');

    const [globalError, setGlobalError] = useState('');
    const [newItemError, setNewItemError] = useState('');

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
        api.get(`/rooms/${roomID}`)
            .then((response) => {
                setRoomName(response.data.room.name);
                setItems(response.data.items);
                setUsers(response.data.users);
                setSimplifiedItems(response.data.simplifiedItems);
            })
            .catch(error => {
                console.error('Error retrieving room:', error);
                setGlobalError(error);
            })
    }, [roomID]);

    useEffect(() => {
        const newUserMap = new Map();
        users.forEach((user) => {
            newUserMap.set(user.id, user.name);
        });
        setUserMap(newUserMap);
    }, [users]);

    const convertIntToStr = (amountInt) => {
        return (amountInt / 100).toFixed(2);
    }

    const handleNewItem = () => {
        api.post(`/rooms/${roomID}/items`, {
                content: newItemName,
                from_user_id: newFromUserID,
                to_user_id: newToUserID,
                amount: parseInt(newAmount.replace(".", ""), 10),
            })
            .then((response) => {
                setItems([...items, response.data.newItem]);
                setSimplifiedItems(response.data.simplifiedItems);
                setNewItemName('');
                setNewAmount('');
            })
            .catch(error => {
                console.error('Error retrieving item:', error);
                setNewItemError(error.response.data);
            });
    };

    const handleDeleteItem = (itemId) => {
        api.delete(`/rooms/${roomID}/items/${itemId}`)
            .then((response) => {
                setItems(items.filter((item) => item.id !== itemId));
                setSimplifiedItems(response.data.simplifiedItems);
            })
            .catch((error) => {
                console.error('Error deleting item:', error);
            });
    };

    const handleBackToHome = () => {
        navigate('/');
    }

    return (
        globalError !== '' ? NotFoundPage() :
        roomName === '' ? LoadingPage() :
        <div>
            <h1>Room {roomName}</h1>
            <h4>{roomID}</h4>
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
                <ul>
                    {users.map((user) => (
                        <li key={user.id}>
                            {user.name}
                            {user.id === loggedUserId && ' (me)'}
                        </li>
                    ))}
                </ul>
            </div>
            <div>
                <h3>Items: </h3>
                <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="Add a new item"
                />
                <select id="userDropdown" onChange={(e) => setNewFromUserID(e.target.value)} value={newFromUserID}>
                    <option value="" disabled>From...</option>
                    {users.map((user) => (
                        <option key={user.id} value={user.id}>
                            {user.name}
                        </option>
                    ))}
                </select>
                <input
                    type="text"
                    id="amount"
                    value={newAmount}
                    onChange={(e) => {
                        if (/^\d*\.?\d{0,2}$/.test(e.target.value)) setNewAmount(e.target.value);
                    }}
                    placeholder="0.00"
                />
                <select id="userDropdown" onChange={(e) => setNewToUserID(e.target.value)} value={newToUserID}>
                    <option value="" disabled>To...</option>
                    {users.map((user) => (
                        <option key={user.id} value={user.id}>
                            {user.name}
                        </option>
                    ))}
                </select>
                <button onClick={handleNewItem}>Post</button>
                {newItemError !== '' && <div>{newItemError}</div>}
                <ul>
                    {items.map((item) => (
                        <li key={item.id}>
                            {item.content}
                            {" "}
                            {userMap.get(item.from_user_id)}
                            {" "}
                            {convertIntToStr(item.amount)}
                            {" "}
                            {userMap.get(item.to_user_id)}
                            {" "}
                            <button onClick={() => handleDeleteItem(item.id)}>x</button>
                        </li>
                    ))}
                </ul>
            </div>
            <div>
                <h3>Settlements: </h3>
                {simplifiedItems.map((item) => (
                    <li key={item.id}>
                        {item.content}
                        {" "}
                        {userMap.get(item.from_user_id)}
                        {" "}
                        {convertIntToStr(item.amount)}
                        {" "}
                        {userMap.get(item.to_user_id)}
                        {" "}
                    </li>
                ))}
            </div>
        </div>
    );
};

export default RoomPage;
