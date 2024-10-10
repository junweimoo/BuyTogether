import React, { useEffect, useState } from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import api from '../Api';
import Cookies from "js-cookie";
import NotFoundPage from "./NotFoundPage";
import LoadingPage from "./LoadingPage";
import { BsCaretLeftFill } from "react-icons/bs";

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
    const [loggedJWT, setLoggedJWT] = useState('');

    const [globalError, setGlobalError] = useState('');
    const [newItemError, setNewItemError] = useState('');

    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const thresholdWidth = 650;
    const minWidth = 400;

    const navigate = useNavigate();

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        setWindowWidth(window.innerWidth);

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const sessionUser = Cookies.get('session_user');
        if (!sessionUser) {
            setGlobalError("Not logged in")
            return
        }
        const parsedUser = JSON.parse(sessionUser);
        setLoggedUsername(parsedUser.username);
        setLoggedUserId(parsedUser.userId);
        setLoggedJWT(parsedUser.jwt);

        api.get(`/rooms/${roomID}`, { headers: { Authorization: `Bearer ${parsedUser.jwt}` } })
            .then((response) => {
                setRoomName(response.data.room.name);
                setItems(response.data.items);
                setUsers(response.data.users);
                setSimplifiedItems(response.data.simplifiedItems);
            })
            .catch(error => {
                console.error('Error retrieving room:', error);
                setGlobalError(error.response.data);
            })
    }, []);

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
        if (newItemName === '') {
            setNewItemError('Please enter a name for this item');
            return;
        }
        api.post(`/rooms/${roomID}/items`, {
                content: newItemName,
                from_user_id: newFromUserID,
                to_user_id: newToUserID,
                amount: parseInt(newAmount.replace(".", ""), 10),
            }, { headers: { Authorization: `Bearer ${loggedJWT}` }})
            .then((response) => {
                setItems([...items, response.data.newItem]);
                setSimplifiedItems(response.data.simplifiedItems);
                setNewItemName('');
                setNewAmount('');
                setNewItemError('');
            })
            .catch(error => {
                console.error('Error retrieving item:', error);
                setNewItemError(error.response.data);
            });
    };

    const handleDeleteItem = (itemId) => {
        api.delete(`/rooms/${roomID}/items/${itemId}`, { headers: { Authorization: `Bearer ${loggedJWT}` }})
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

    const handleSimplify = (algoType) => {
        api.post(`/rooms/${roomID}/simplify?algo=${algoType}`, undefined,
            { headers: { Authorization: `Bearer ${loggedJWT}` }})
            .then((response) => {
                setSimplifiedItems(response.data.simplifiedItems);
            })
            .catch((error) => {
                console.error('Error during simplification:', error);
            });
    }

    return (
        globalError !== '' ? NotFoundPage(globalError) :
            roomName === '' ? LoadingPage() :
                <div className="min-h-screen bg-gray-100" style={{ minWidth: `${minWidth}px`}}>
                    {/* Top Bar */}
                    <div className="bg-blue-600 text-white flex justify-between items-center px-4 py-4">
                        <div className="flex space-x-3 items-center">
                            <button
                                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                                onClick={handleBackToHome}>
                                <BsCaretLeftFill/>
                            </button>
                            {/* Room Name */}
                            <div className="pl-3 text-xl font-semibold">
                                {roomName}
                            </div>
                            <button
                                className="border-2 text-sm bg-blue-500 hover:bg-blue-700 text-white font-bold py-0 px-3 rounded"
                                onClick={() => navigator.clipboard.writeText(roomID)}>
                                Copy ID
                            </button>
                            <div className="flex items-center space-x-2">
                                {/*{ windowWidth > thresholdWidth && <span className="text-gray-300">ID: {roomID}</span>}*/}
                            </div>
                        </div>
                        {/* Logged In User Info */}
                        <div className="ml-auto flex items-center space-x-4">
                            {windowWidth > thresholdWidth && <div className="ml-2 items-center">
                                Logged in as: <span className="font-bold">{loggedUsername}</span>
                            </div>}
                            {/*<button*/}
                            {/*    className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-3 rounded"*/}
                            {/*    onClick={handleBackToHome}*/}
                            {/*>*/}
                            {/*    Home*/}
                            {/*</button>*/}
                            {/* Room ID with Copy Button */}
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="p-6">
                        {/* Users List */}
                        <div className="bg-white shadow-md rounded p-6 mb-4">
                            <h3 className="text-xl font-semibold mb-2">Users</h3>
                            <ul className="list-disc list-inside space-y-2">
                                {users.map((user) => (
                                    <li key={user.id} className="text-lg">
                                        {user.name}
                                        {user.id === loggedUserId && <span className="text-blue-500 ml-2">(me)</span>}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Items List */}
                        <div className="bg-white shadow-md rounded p-6 mb-4">
                            <h3 className="text-xl font-semibold mb-4">Items</h3>
                            <div className="mb-8">
                                <div className="flex flex-wrap items-center space-x-4 mb-4">
                                    <input
                                        type="text"
                                        className="border rounded p-2 flex-grow"
                                        value={newItemName}
                                        onChange={(e) => setNewItemName(e.target.value)}
                                        placeholder="Add a new item"
                                    />
                                    <select
                                        id="userDropdown"
                                        className="border rounded p-2"
                                        onChange={(e) => setNewFromUserID(e.target.value)}
                                        value={newFromUserID}
                                    >
                                        <option value="" disabled>From...</option>
                                        {users.map((user) => (
                                            <option key={user.id} value={user.id} disabled={user.id === newToUserID}>
                                                {user.name}
                                            </option>
                                        ))}
                                    </select>
                                    <input
                                        type="text"
                                        className="border rounded p-2 w-24"
                                        id="amount"
                                        value={newAmount}
                                        onChange={(e) => {
                                            if (/^\d*\.?\d{0,2}$/.test(e.target.value)) setNewAmount(e.target.value);
                                        }}
                                        placeholder="0.00"
                                    />
                                    <select
                                        id="userDropdown"
                                        className="border rounded p-2"
                                        onChange={(e) => setNewToUserID(e.target.value)}
                                        value={newToUserID}
                                    >
                                        <option value="" disabled>To...</option>
                                        {users.map((user) => (
                                            <option key={user.id} value={user.id} disabled={user.id === newFromUserID}>
                                                {user.name}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                                        onClick={handleNewItem}
                                    >
                                        Post
                                    </button>
                                </div>
                                {newItemError && <div className="text-red-500 mb-4">{newItemError}</div>}
                            </div>
                            <ul className="space-y-2">
                                {items.map((item) => (
                                    <li key={item.id} className="flex justify-between items-center p-4 border rounded">
                                        <div className="text-lg">
                                            {item.content}
                                            {" "}
                                            <span className="text-gray-500">({userMap.get(item.from_user_id)})</span>
                                            {" "}
                                            <span className="font-bold">{convertIntToStr(item.amount)}</span>
                                            {" "}
                                            <span className="text-gray-500">to</span>
                                            {" "}
                                            <span className="text-gray-500">({userMap.get(item.to_user_id)})</span>
                                        </div>
                                        <button
                                            className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded"
                                            onClick={() => handleDeleteItem(item.id)}
                                        >
                                            x
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Settlements Section */}
                        <div className="bg-white shadow-md rounded p-6 mb-4">
                            <h3 className="text-xl font-semibold mb-4">Settlements</h3>
                            <div className="space-x-4 mb-4">
                                <button
                                    className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                                    onClick={() => handleSimplify(0)}
                                >
                                    Reset
                                </button>
                                <button
                                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                                    onClick={() => handleSimplify(1)}
                                >
                                    Greedy
                                </button>
                                <button
                                    className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                                    onClick={() => handleSimplify(2)}
                                >
                                    Preserve
                                </button>
                            </div>
                            <ul className="space-y-2">
                                {simplifiedItems.map((item) => (
                                    <li key={item.id} className="p-4 border rounded">
                                        {item.content}
                                        {" "}
                                        <span className="text-gray-500">{userMap.get(item.from_user_id)}</span>
                                        {" "}
                                        <span className="font-bold">{convertIntToStr(item.amount)}</span>
                                        {" "}
                                        <span className="text-gray-500">to</span>
                                        {" "}
                                        <span className="text-gray-500">{userMap.get(item.to_user_id)}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
    );
};

export default RoomPage;
