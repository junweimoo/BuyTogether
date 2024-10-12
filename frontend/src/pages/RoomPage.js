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
    const [users, setUsers] = useState([]);
    const [userMap, setUserMap] = useState(new Map());
    const [userToAmountMap, setUserToAmountMap] = useState(new Map());

    const [items, setItems] = useState([]);
    const [simplifiedItems, setSimplifiedItems] = useState([]);
    const [groupedItems, setGroupedItems] = useState([]);

    const [newItemName, setNewItemName] = useState('');
    const [newAmount, setNewAmount] = useState('');
    const [newFromUserID, setNewFromUserID] = useState('');
    const [newToUserID, setNewToUserID] = useState('');

    const [newAmounts, setNewAmounts] = useState([]);
    const [amountsMatch, setAmountsMatch] = useState(false);

    const [loggedUsername, setLoggedUsername] = useState('');
    const [loggedUserId, setLoggedUserId] = useState('');
    const [loggedJWT, setLoggedJWT] = useState('');

    const [globalError, setGlobalError] = useState('');
    const [newItemError, setNewItemError] = useState('');

    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const thresholdWidth = 650;
    const minWidth = 400;

    const tabs = ['Expense', 'Income', 'Transfer'];
    const [activeTab, setActiveTab] = useState(tabs[0]);

    const [showUsers, setShowUsers] = useState(true);
    const [showTransactions, setShowTransactions] = useState(true);
    const [showSettlements, setShowSettlements] = useState(true);

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
                setNewAmounts(response.data.users.map((_) => ""))
                setUsers(response.data.users);
                setSimplifiedItems(response.data.simplifiedItems);
            })
            .catch(error => {
                console.error('Error retrieving room:', error);
                setGlobalError(error.response.data);
            })
    }, [roomID]);

    useEffect(() => {
        const newUserMap = new Map();
        users.forEach((user) => {
            newUserMap.set(user.id, user.name);
        });
        setNewAmounts(users.map((u) => ""))
        setUserMap(newUserMap);
    }, [users]);

    useEffect(() => {
        setUserToAmountMap(getUserToAmountMap(simplifiedItems));
    }, [simplifiedItems]);

    useEffect(() => {
        setGroupedItems(getGroupedItems(items));
    }, [items])

    function formatDateTime(dateTimeString) {
        const dateObj = new Date(dateTimeString);

        const hours = dateObj.getHours().toString().padStart(2, '0');
        const minutes = dateObj.getMinutes().toString().padStart(2, '0');

        const datePart = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD format

        return `${hours}:${minutes}, ${datePart}`;
    }

    const convertIntToStr = (amountInt) => {
        return (amountInt / 100).toFixed(2);
    }

    const convertStrToInt = (amountStr) => {
        if (amountStr === "") {
            return 0;
        } if (amountStr.includes(".")) {
            const decimalPoints = amountStr.length - amountStr.indexOf(".") - 1;
            if (decimalPoints === 2) return parseInt(amountStr.replace(".", ""), 10);
            else if (decimalPoints === 1) return parseInt(amountStr.replace(".", ""), 10) * 10;
            else return parseInt(amountStr.replace(".", ""), 10) * 100;
        } else {
            return parseInt(amountStr, 10) * 100;
        }
    }

    const getAmountsSum = (amts) => {
        return amts.reduce((accumulator, amount) => accumulator + convertStrToInt(amount), 0);
    }

    const getAmount = (amt) => {
        return convertStrToInt(amt);
    }

    const getUserToAmountMap = (simplifiedItems) => {
        const idToNetAmountMap = new Map();
        simplifiedItems.forEach((item) => {
            if (idToNetAmountMap[item.from_user_id] === undefined) {
                idToNetAmountMap[item.from_user_id] = 0;
            }
            if (idToNetAmountMap[item.to_user_id] === undefined) {
                idToNetAmountMap[item.to_user_id] = 0;
            }
            idToNetAmountMap[item.from_user_id] -= parseInt(item.amount, 10);
            idToNetAmountMap[item.to_user_id] += parseInt(item.amount, 10);
        })
        return idToNetAmountMap;
    }

    const getUserAmountComponent = (userid) => {
        const amt = userToAmountMap[userid] !== undefined ? userToAmountMap[userid] : 0;
        return amt > 0 ?
            <span className="text-purple-500">+{convertIntToStr(amt)}</span> :
            amt < 0 ?
                <span className="text-orange-500">{convertIntToStr(amt)}</span> :
                    <span className="text-green-500">0.00</span>;
    }

    const getGroupedItems = (theItems) => {
        const groupToItemsMap = new Map();

        theItems.forEach((item) => {
            if (!groupToItemsMap.has(item.group_id)) {
                groupToItemsMap.set(item.group_id, {
                    name: item.content,
                    group_id: item.group_id,
                    time: item.created_at,
                    type: item.transaction_type,
                    items: [],
                    amount: 0
                });
            }

            const group = groupToItemsMap.get(item.group_id)
            group.items.push(item);
            group.amount += item.amount;
        });

        return Array.from(groupToItemsMap.values());
    };

    const handleNewTransfer = () => {
        if (newItemName === '') {
            setNewItemError('Please enter a name for this item');
            return;
        }
        api.post(`/rooms/${roomID}/items`, {
                content: newItemName,
                to_user_id: newFromUserID,
                from_user_id: newToUserID,
                amount: convertStrToInt(newAmount),
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

    const handleNewGroupExpense = () => {
        if (newItemName === '') {
            setNewItemError('Please enter a name for this item');
            return;
        }
        api.post(`/rooms/${roomID}/items/groupExpense`, {
            items: newAmounts.map((amt, idx) => ({
                content: newItemName,
                from_user_id: users[idx].id,
                to_user_id: newToUserID,
                amount: convertStrToInt(amt)})
            ).filter((item) => item.amount !== 0)}, { headers: { Authorization: `Bearer ${loggedJWT}` }})
            .then((response) => {
                setItems([...items, ...response.data.newItems]);
                setSimplifiedItems(response.data.simplifiedItems);
                setNewFromUserID('');
                setNewToUserID('');
                setNewItemName('');
                setNewAmount('');
                setNewItemError('');
                setNewAmounts(users.map((_) => ""))
            })
            .catch(error => {
                console.error('Error retrieving item:', error);
                setNewItemError(error.response.data);
            });
    }

    const handleNewGroupIncome = () => {
        if (newItemName === '') {
            setNewItemError('Please enter a name for this item');
            return;
        }
        api.post(`/rooms/${roomID}/items/groupIncome`, {
            items: newAmounts.map((amt, idx) => ({
                content: newItemName,
                from_user_id: newFromUserID,
                to_user_id: users[idx].id,
                amount: convertStrToInt(amt)})
            ).filter((item) => item.amount !== 0)}, { headers: { Authorization: `Bearer ${loggedJWT}` }})
            .then((response) => {
                setItems([...items, ...response.data.newItems]);
                setSimplifiedItems(response.data.simplifiedItems);
                setNewFromUserID('');
                setNewToUserID('');
                setNewItemName('');
                setNewAmount('');
                setNewItemError('');
                setNewAmounts(users.map((_) => ""))
            })
            .catch(error => {
                console.error('Error retrieving item:', error);
                setNewItemError(error.response.data);
            });
    }

    const handleSettle = (sItem) => {
        api.post(`/rooms/${roomID}/items`, {
            content: userMap.get(sItem.from_user_id) + " pays " + userMap.get(sItem.to_user_id),
            to_user_id: sItem.from_user_id,
            from_user_id: sItem.to_user_id,
            amount: sItem.amount,
        }, { headers: { Authorization: `Bearer ${loggedJWT}` }})
            .then((response) => {
                setItems([...items, response.data.newItem]);
                setSimplifiedItems(response.data.simplifiedItems);
                setNewItemName('');
                setNewAmount('');
                setNewItemError('');
            })
            .catch(error => {
                console.error('Error creating item:', error);
                setNewItemError(error.response.data);
            });
    }

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

    const handleDeleteGroup = (groupId) => {
        api.delete(`/rooms/${roomID}/groups/${groupId}`, { headers: { Authorization: `Bearer ${loggedJWT}` }})
            .then((response) => {
                setItems(items.filter((item) => item.group_id !== groupId));
                setSimplifiedItems(response.data.simplifiedItems);
            })
            .catch((error) => {
                console.error('Error deleting group:', error);
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
                                className="text-sm bg-blue-500 hover:bg-blue-700 text-white font-bold py-0 px-3 rounded"
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
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="p-6">
                        {/* Users List */}
                        <div className="bg-white shadow-md rounded p-6 mb-4">
                            <button className="flex space-x-2" onClick={() => setShowUsers(!showUsers)}>
                                <h3 className={`text-xl font-semibold ${showUsers && "mb-4"}`}>Users</h3>
                                <h3 className="text-gray-400 mt-0.5 ml-3">{showUsers ? '▲' : '▼'}</h3>
                            </button>
                            {showUsers && <ul className="list-disc list-inside space-y-2">
                                {users.map((user) => (
                                    <li key={user.id} className="rounded border flex p-2 space-x-2">
                                        <span className={"text-blue-500"}>{user.name}</span>
                                        {user.id === loggedUserId && <span className="text-blue-700">(me)</span>}
                                        <span>
                                            {getUserAmountComponent(user.id)}
                                        </span>
                                    </li>
                                ))}
                            </ul>}
                        </div>

                        {/* Items List */}
                        <div className="bg-white shadow-md rounded p-6 mb-4">
                            <button className="flex space-x-2" onClick={() => setShowTransactions(!showTransactions)}>
                                <h3 className={`text-xl font-semibold ${showTransactions && "mb-4"}`}>Transactions</h3>
                                <h3 className="text-gray-400 mt-0.5 ml-3">{showTransactions ? '▲' : '▼'}</h3>
                            </button>

                            {showTransactions && <div>
                                {/* New Item Menu */}
                                <div className="mb-8 border-2 p-3 space-y-2 rounded">

                                    {/* Tabs Header */}
                                    <div className="flex border-b border-gray-300">
                                        {tabs.map((tab, index) => (
                                            <button
                                                key={index}
                                                className={`flex-1 py-2 px-4 text-center focus:outline-none ${
                                                    activeTab === tab
                                                        ? 'border-b-4 border-blue-500 text-blue-600 font-semibold'
                                                        : 'text-gray-600 hover:text-blue-500'
                                                }`}
                                                onClick={() => setActiveTab(tab)}
                                            >
                                                {tab}
                                            </button>
                                        ))}
                                    </div>

                                    {activeTab === tabs[0] ?
                                        // Split expense
                                        <div className="flex flex-col space-x-4 space-y-2 items-start">
                                            <div className="flex flex-col items-center space-x-4 space-y-2 w-full">
                                                <input
                                                    type="text"
                                                    className="border rounded p-2 flex-grow w-full"
                                                    value={newItemName}
                                                    onChange={(e) => setNewItemName(e.target.value)}
                                                    placeholder="Add a new item"
                                                />
                                            </div>
                                            <div className="flex space-x-4 items-center">
                                                <input
                                                    type="text"
                                                    className="border rounded p-2 w-24"
                                                    id="amount"
                                                    value={newAmount}
                                                    onChange={(e) => {
                                                        if (/^\d*\.?\d{0,2}$/.test(e.target.value)) {
                                                            setNewAmount(e.target.value)

                                                            if (e.target.value !== "" && getAmount(e.target.value) === getAmountsSum(newAmounts)) {
                                                                setAmountsMatch(true);
                                                            } else {
                                                                setAmountsMatch(false);
                                                            }
                                                        }
                                                        ;
                                                    }}
                                                    placeholder="0.00"
                                                />
                                                <span>paid by</span>
                                                <select
                                                    id="userDropdown"
                                                    className="border rounded p-2"
                                                    onChange={(e) => setNewToUserID(e.target.value)}
                                                    value={newToUserID}
                                                >
                                                    <option value="" disabled>By...</option>
                                                    {users.map((user) => (
                                                        <option key={user.id} value={user.id}>
                                                            {user.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            {"" !== newToUserID && users.map((user, idx) => (
                                                <li key={user.id}
                                                    className="flex space-x-2">
                                                    <input
                                                        type="text"
                                                        className="border rounded p-2 w-24 text-sm"
                                                        id="amount"
                                                        value={newAmounts[idx]}
                                                        onChange={(e) => {
                                                            if (/^\d*\.?\d{0,2}$/.test(e.target.value)) {
                                                                const nextAmounts = [...newAmounts];
                                                                nextAmounts[idx] = e.target.value;
                                                                setNewAmounts(nextAmounts);

                                                                if (getAmount(newAmount) === getAmountsSum(nextAmounts)) {
                                                                    setAmountsMatch(true);
                                                                } else {
                                                                    setAmountsMatch(false);
                                                                }
                                                            }
                                                        }}
                                                        placeholder="0.00"
                                                    />
                                                    <span>spent by</span>
                                                    <span className="text-blue-500">{user.name}</span>
                                                </li>
                                            ))}
                                            <button
                                                className={`${amountsMatch && convertStrToInt(newAmount) !== 0 ? "bg-green-500 hover:bg-green-700" : "bg-gray-300"} text-white font-bold py-2 px-4 rounded m-auto`}
                                                onClick={handleNewGroupExpense}
                                                disabled={!(amountsMatch && convertStrToInt(newAmount) !== 0)}
                                            >
                                                Post
                                            </button>
                                            {newItemError && <div className="text-center text-red-500">{newItemError}</div>}
                                        </div> :
                                        activeTab === tabs[1] ?

                                            // Split income
                                            <div className="flex flex-col space-x-4 space-y-2 items-start">
                                                <div className="flex flex-col items-center space-x-4 space-y-2 w-full">
                                                    <input
                                                        type="text"
                                                        className="border rounded p-2 flex-grow w-full"
                                                        value={newItemName}
                                                        onChange={(e) => setNewItemName(e.target.value)}
                                                        placeholder="Add a new item"
                                                    />
                                                </div>
                                                <div className="flex space-x-4 items-center">
                                                    <input
                                                        type="text"
                                                        className="border rounded p-2 w-24"
                                                        id="amount"
                                                        value={newAmount}
                                                        onChange={(e) => {
                                                            if (/^\d*\.?\d{0,2}$/.test(e.target.value)) {
                                                                setNewAmount(e.target.value)

                                                                if (e.target.value !== "" && getAmount(e.target.value) === getAmountsSum(newAmounts)) {
                                                                    setAmountsMatch(true);
                                                                } else {
                                                                    setAmountsMatch(false);
                                                                }
                                                            }
                                                        }}
                                                        placeholder="0.00"
                                                    />
                                                    <span>paid to</span>
                                                    <select
                                                        id="userDropdown"
                                                        className="border rounded p-2"
                                                        onChange={(e) => setNewFromUserID(e.target.value)}
                                                        value={newFromUserID}
                                                    >
                                                        <option value="" disabled>By...</option>
                                                        {users.map((user) => (
                                                            <option key={user.id} value={user.id}>
                                                                {user.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                {"" !== newFromUserID && users.map((user, idx) => (
                                                    <li key={user.id}
                                                        className="flex space-x-2">
                                                        <input
                                                            type="text"
                                                            className="border rounded p-2 w-24 text-sm"
                                                            id="amount"
                                                            value={newAmounts[idx]}
                                                            onChange={(e) => {
                                                                if (/^\d*\.?\d{0,2}$/.test(e.target.value)) {
                                                                    const nextAmounts = [...newAmounts];
                                                                    nextAmounts[idx] = e.target.value;
                                                                    setNewAmounts(nextAmounts);

                                                                    if (getAmount(newAmount) === getAmountsSum(nextAmounts)) {
                                                                        setAmountsMatch(true);
                                                                    } else {
                                                                        setAmountsMatch(false);
                                                                    }
                                                                }
                                                            }}
                                                            placeholder="0.00"
                                                        />
                                                        <span>due to</span>
                                                        <span className="text-blue-500">{user.name}</span>
                                                    </li>
                                                ))}
                                                <button
                                                    className={`${amountsMatch && convertStrToInt(newAmount) !== 0 ? "bg-green-500 hover:bg-green-700" : "bg-gray-300"} text-white font-bold py-2 px-4 rounded m-auto`}
                                                    onClick={handleNewGroupIncome}
                                                    disabled={!(amountsMatch && convertStrToInt(newAmount) !== 0)}
                                                >
                                                    Post
                                                </button>
                                                {newItemError &&
                                                    <div className="text-center text-red-500">{newItemError}</div>}
                                            </div> :

                                            // Transfer from one user to another
                                            <div className="flex flex-col items-center space-x-4 space-y-2">
                                                <input
                                                    type="text"
                                                    className="border rounded p-2 flex-grow w-full"
                                                    value={newItemName}
                                                    onChange={(e) => setNewItemName(e.target.value)}
                                                    placeholder="Add a new item"
                                                />
                                                <div className="space-x-2">
                                                    <select
                                                        id="userDropdown"
                                                        className="border rounded p-2"
                                                        onChange={(e) => setNewFromUserID(e.target.value)}
                                                        value={newFromUserID}
                                                    >
                                                        <option value="" disabled>From...</option>
                                                        {users.map((user) => (
                                                            <option key={user.id} value={user.id}
                                                                    disabled={user.id === newToUserID}>
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
                                                            <option key={user.id} value={user.id}
                                                                    disabled={user.id === newFromUserID}>
                                                                {user.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <button
                                                    className={`${(convertStrToInt(newAmount) !== 0 && newToUserID !== '' && newFromUserID !== '') ? "bg-green-500 hover:bg-green-700" : "bg-gray-300"} text-white font-bold py-2 px-4 rounded m-auto`}
                                                    onClick={handleNewTransfer}
                                                    disabled={!(convertStrToInt(newAmount) !== 0 && newToUserID !== '' && newFromUserID !== '')}
                                                >
                                                    Post
                                                </button>
                                                {newItemError &&
                                                    <div className="text-center text-red-500">{newItemError}</div>}
                                            </div>}
                                </div>

                                {/* Item List */}
                                <ul className="space-y-3">
                                {groupedItems.map((gitem, _) => (
                                    <li key={gitem.group_id} className={`
                                        ${gitem.type === "TRANSFER" && "bg-green-50"} 
                                        ${gitem.type === "INCOME" && "bg-purple-50"} 
                                        ${gitem.type === "EXPENSE" && "bg-orange-50"} 
                                        flex justify-between items-center p-4 border rounded
                                    `}>
                                        <div className={"space-y-2 w-full"}>
                                            <div className="flex items-center justify-between w-full">
                                                <div className="flex-grow space-x-2">
                                                    <span className="font-bold">{gitem.name}</span>
                                                    <span className={`
                                                        ${gitem.type === "TRANSFER" && "text-green-600"}
                                                        ${gitem.type === "INCOME" && "text-purple-600"}
                                                        ${gitem.type === "EXPENSE" && "text-orange-600"}
                                                        font-bold
                                                    `}>{convertIntToStr(gitem.amount)}</span>
                                                    <span className="text-gray-500">{formatDateTime(gitem.time)}</span>
                                                </div>
                                                <button
                                                    className="hover:text-red-500 text-gray-700 font-bold py-0.5 px-2 rounded ml-auto mr-4"
                                                    onClick={() => handleDeleteGroup(gitem.group_id)}
                                                >
                                                    X
                                                </button>
                                            </div>

                                            <ul className="w-full">
                                                {gitem.items.map((item) => (
                                                    <li key={item.id}
                                                        className="flex justify-between items-center p-4 border rounded">
                                                        <div>{
                                                            gitem.type === "TRANSFER" ?
                                                                <div>
                                                                    {" "}
                                                                    <span
                                                                        className="text-blue-500">({userMap.get(item.to_user_id)})</span>
                                                                    {" "}
                                                                    <span className="flex-grow">
                                                                <span className="text-gray-500">paid</span>
                                                                        {" "}
                                                                        <span
                                                                            className="font-bold">{convertIntToStr(item.amount)}</span>
                                                                        {" "}
                                                                        <span className="text-gray-500">to</span>
                                                                </span>
                                                                    {" "}
                                                                    <span
                                                                        className="text-blue-500">({userMap.get(item.from_user_id)})</span>
                                                                </div> :
                                                                <div
                                                                    className={windowWidth > thresholdWidth ? "flex space-x-2" : "flex-col space-y-1"}>
                                                                    {" "}
                                                                    <span
                                                                        className="text-blue-500">({userMap.get(item.from_user_id)})</span>
                                                                    {" "}
                                                                    <span className="flex-grow">
                                                                <span className="text-gray-500">owes</span>
                                                                        {" "}
                                                                        <span
                                                                            className="font-bold">{convertIntToStr(item.amount)}</span>
                                                                        {" "}
                                                                        <span className="text-gray-500">to</span>
                                                                </span>
                                                                    {" "}
                                                                    <span
                                                                        className="text-blue-500">({userMap.get(item.to_user_id)})</span>
                                                                </div>
                                                        }</div>
                                                        <button
                                                            className="hover:text-red-500 text-gray-400 font-bold py-0.5 px-2 rounded"
                                                            onClick={() => handleDeleteItem(item.id)}>
                                                            X
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                            </div>}
                        </div>

                        {/* Settlements Section */}
                        <div className="bg-white shadow-md rounded p-6 mb-2">
                            <button className="flex space-x-2" onClick={() => setShowSettlements(!showSettlements)}>
                                <h3 className={`text-xl font-semibold ${showSettlements && "mb-4"}`}>Settlements</h3>
                                <h3 className="text-gray-400 mt-0.5 ml-3">{showSettlements ? '▲' : '▼'}</h3>
                            </button>
                            {showSettlements && <div>
                                <div className="space-x-4 mb-4 border p-2">
                                    <span className="text-lg">Algo:</span>
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
                                        <li key={item.id} className={ windowWidth < thresholdWidth ? "p-4 border rounded flex flex-col" : "p-4 border rounded flex" }>
                                            {" "}
                                            <span className="text-orange-600">{userMap.get(item.from_user_id)}</span>
                                            {" "}
                                            <span className="ml-2 mr-2">
                                                <span className="text-gray-500">pays</span>
                                                {" "}
                                                <span className="font-bold">{convertIntToStr(item.amount)}</span>
                                                {" "}
                                                <span className="text-gray-500">to</span>
                                            </span>
                                            {" "}
                                            <span className="text-purple-600">{userMap.get(item.to_user_id)}</span>
                                            {" "}
                                            <button className="ml-auto text-sm underline text-green-600" onClick={() => handleSettle(item)}>Settle</button>
                                        </li>
                                    ))}
                                </ul>
                            </div>}
                        </div>
                    </div>
                </div>
    );
};

export default RoomPage;
