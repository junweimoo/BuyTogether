import React, { useEffect, useState } from 'react';
import {redirect, useNavigate, useParams} from 'react-router-dom';
import api from '../Api';
import Cookies from "js-cookie";
import NotFoundPage from "./NotFoundPage";
import LoadingPage from "./LoadingPage";
import { BsCaretLeftFill } from "react-icons/bs";
import { PiArrowDown, PiArrowsSplit } from "react-icons/pi";
import { LuSquareEqual, LuSquareSlash } from "react-icons/lu";

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
    const thresholdWidth = 768;
    const minWidth = 340;

    const tabs = ['Expense', 'Income', 'Transfer'];
    const [activeTab, setActiveTab] = useState(tabs[0]);

    const [showUsers, setShowUsers] = useState(true);
    const [showTransactions, setShowTransactions] = useState(true);
    const [showSettlements, setShowSettlements] = useState(true);

    const [isCopied, setIsCopied] = useState(false);

    const INVALID_TOKEN = "INVALID_TOKEN";
    const HTTP_UNAUTHORIZED = 401;
    const NAME_TRUNCATE_LENGTH = 20;

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
            navigate('/');
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
                if (!error.response) {
                    setGlobalError("SERVER_ERROR");
                } else if (error.response.status === HTTP_UNAUTHORIZED) {
                    navigate('/');
                } else {
                    setGlobalError(error.response.data);
                }
            })

        const eventSource = new EventSource(`${api.defaults.baseURL}/rooms/${roomID}/sse?token=${encodeURIComponent(parsedUser.jwt)}`);
        eventSource.onmessage = (event) => {
            if (!event.data) {
                setGlobalError("SERVER_ERROR");
                return;
            }
            const parsedItems = JSON.parse(event.data);
            setItems((prevItems) => {
                var deletedItems = parsedItems.deleted_items;
                if (deletedItems) {
                    var deletedItemIds = deletedItems.map(item => item.id);
                    prevItems = prevItems.filter((item) => !deletedItemIds.includes(item.id));
                }

                var newItems = parsedItems.new_items;
                if (newItems) {
                    prevItems =  [...prevItems, ...newItems]
                }

                return prevItems
            });

            if (parsedItems.simplified_items) {
                setSimplifiedItems(parsedItems.simplified_items);
            }

            if (parsedItems.new_user) {
                setUsers((prevUsers) => {
                    if (prevUsers.findIndex((u) => u.id === parsedItems.new_user.id) === -1) {
                        prevUsers = [...prevUsers, parsedItems.new_user];
                    }
                    return prevUsers;
                });
            }
        };

        return () => {
            eventSource.close();
        };
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
        
        const options = { day: '2-digit', month: 'short' };
        const datePart = dateObj.toLocaleDateString('en-GB', options);

        return `${datePart} ${hours}:${minutes}`;
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
                    amount: 0,
                    user_id: item.transaction_type === "EXPENSE" ? item.to_user_id : item.from_user_id,
                });
            }

            const group = groupToItemsMap.get(item.group_id)
            group.items.push(item);
            group.amount += item.amount;
        });

        return Array.from(groupToItemsMap.values());
    };

    const truncateLongNames = (s) => {
        if (s.length > NAME_TRUNCATE_LENGTH) return s.substring(0, NAME_TRUNCATE_LENGTH) + "...";
        else return s;
    }

    const splitAmountEvenly = () => {
        const numUsers = users.length;
        const amtToSplit = convertStrToInt(newAmount);
        const evenlySplitNum = (amtToSplit / numUsers).toFixed(0);
        const nextAmounts = users.map(_ => convertIntToStr(evenlySplitNum));
        setNewAmounts(nextAmounts);
        if (amtToSplit === getAmountsSum(nextAmounts)) {
            setAmountsMatch(true);
        } else {
            setAmountsMatch(false);
        }
    }

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

    function getExpenseForm() {
        return <div className="flex flex-col space-y-4 items-start w-full">
            <div className="flex w-full flex-row space-x-4 space-y-0 justify-center px-3 pt-2">
                <input
                    type="text"
                    className="border rounded px-2 w-20 text-sm"
                    id="amount"
                    value={newAmount}
                    onChange={(e) => {
                        if (/^\d*\.?\d{0,2}$/.test(e.target.value)) {
                            setNewAmount(e.target.value);
                            if (e.target.value !== "" && getAmount(e.target.value) === getAmountsSum(newAmounts)) {
                                setAmountsMatch(true);
                            } else {
                                setAmountsMatch(false);
                            }
                        }
                    }}
                    placeholder="0.00"
                />
                <span className="ml-2 py-1">by</span>
                <select
                    id="userDropdown"
                    className="border rounded px-2 md:flex-none flex-grow text-sm"
                    onChange={(e) => setNewToUserID(e.target.value)}
                    value={newToUserID}
                >
                    <option value="" disabled>
                        By...
                    </option>
                    {users.map((user) => (
                        <option key={user.id} value={user.id}>
                            {truncateLongNames(user.name)}
                        </option>
                    ))}
                </select>
            </div>
            {"" !== newToUserID && <div className="w-full">
                <div className="flex justify-center items-center w-full mb-2">
                    <PiArrowsSplit className="text-2xl"/>
                </div>

                <div className="flex justify-center items-center w-full mb-2">
                    <button className="underline text-sm text-blue-600" onClick={splitAmountEvenly}>
                        Split evenly
                    </button>
                </div>

                <div className="w-full flex justify-center">
                    <ul className="space-y-1">
                        {users.map((user, idx) => (
                            <li key={user.id} className="flex w-full flex-row space-x-4 items-center">
                                <input
                                    type="text"
                                    className="border rounded px-2 py-1 w-20 text-sm"
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
                                <span>by</span>
                                <span className="text-blue-500 md:flex-none flex-grow">
                                    {truncateLongNames(user.name)}
                                </span>
                            </li>
                        ))}
                        {!amountsMatch && <li className="text-sm flex flex-row justify-center space-x-2 items-center w-full pt-4">
                            <span>Residue:</span>
                            <span className={"font-bold"}>{
                                convertIntToStr(convertStrToInt(newAmount) - getAmountsSum(newAmounts))
                            }</span>
                        </li>}
                    </ul>
                </div>

                <div className="mt-5 flex flex-col items-center w-full space-y-2 px-3">
                    <input
                        type="text"
                        className="border rounded py-1 px-2 w-full md:w-3/4"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder="Description"
                    />
                </div>
            </div>}

            {newItemError && <div className="w-full text-center text-red-500">{newItemError}</div>}

            <button
                className={`${
                    newToUserID !== "" && amountsMatch && convertStrToInt(newAmount) !== 0
                        ? "bg-green-500 hover:bg-green-700"
                        : "bg-gray-300"
                } text-white font-bold py-1 px-4 rounded w-full m-auto`}
                onClick={handleNewGroupExpense}
                disabled={!(newToUserID !== "" && amountsMatch && convertStrToInt(newAmount) !== 0)}
            >
                Post
            </button>
        </div>
            ;
    }

    function getIncomeForm() {
        return <div className="flex flex-col space-y-4 items-start w-full">
            <div className="flex w-full flex-row space-x-4 space-y-0 justify-center px-3 pt-2">
                <input
                    type="text"
                    className="border rounded px-2 w-20 text-sm"
                    id="amount"
                    value={newAmount}
                    onChange={(e) => {
                        if (/^\d*\.?\d{0,2}$/.test(e.target.value)) {
                            setNewAmount(e.target.value);
                            if (e.target.value !== "" && getAmount(e.target.value) === getAmountsSum(newAmounts)) {
                                setAmountsMatch(true);
                            } else {
                                setAmountsMatch(false);
                            }
                        }
                    }}
                    placeholder="0.00"
                />
                <span className="ml-2 py-1">by</span>
                <select
                    id="userDropdown"
                    className="border rounded px-2 md:flex-none flex-grow text-sm"
                    onChange={(e) => setNewFromUserID(e.target.value)}
                    value={newFromUserID}
                >
                    <option value="" disabled>
                        To...
                    </option>
                    {users.map((user) => (
                        <option key={user.id} value={user.id}>
                            {truncateLongNames(user.name)}
                        </option>
                    ))}
                </select>
            </div>
            {"" !== newFromUserID && <div className="w-full">
                <div className="flex justify-center items-center w-full mb-2">
                    <PiArrowsSplit className="text-2xl"/>
                </div>

                <div className="flex justify-center items-center w-full mb-2">
                    <button className="underline text-sm text-blue-600" onClick={splitAmountEvenly}>
                        Split evenly
                    </button>
                </div>

                <div className="w-full flex justify-center">
                    <ul className="space-y-1">
                        {users.map((user, idx) => (
                            <li key={user.id} className="flex w-full flex-row space-x-4 items-center">
                                <input
                                    type="text"
                                    className="border rounded px-2 py-1 w-20 text-sm"
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
                                <span>to</span>
                                <span className="text-blue-500 md:flex-none flex-grow">
                                    {truncateLongNames(user.name)}
                                </span>
                            </li>
                        ))}
                        {!amountsMatch && <li className="text-sm flex flex-row justify-center space-x-2 items-center w-full pt-4">
                            <span>Residue:</span>
                            <span className={"font-bold"}>{
                                convertIntToStr(convertStrToInt(newAmount) - getAmountsSum(newAmounts))
                            }</span>
                        </li>}
                    </ul>
                </div>

                <div className="mt-5 flex flex-col items-center w-full space-y-2 px-3">
                    <input
                        type="text"
                        className="border rounded py-1 px-2 w-full md:w-3/4"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder="Description"
                    />
                </div>
            </div>}

            {newItemError && <div className="w-full text-center text-red-500">{newItemError}</div>}

            <button
                className={`${
                    newFromUserID !== "" && amountsMatch && convertStrToInt(newAmount) !== 0
                        ? "bg-green-500 hover:bg-green-700"
                        : "bg-gray-300"
                } text-white font-bold py-1 px-4 rounded w-full m-auto`}
                onClick={handleNewGroupIncome}
                disabled={!(newFromUserID !== "" && amountsMatch && convertStrToInt(newAmount) !== 0)}
            >
                Post
            </button>
        </div>
            ;
    };

    function getTransferForm() {
        return <div className="flex flex-col items-center space-y-2 pt-2">
            <div className="flex flex-col items-center space-y-3 w-full text-sm mb-2">
                <select
                    id="userDropdown"
                    className="border rounded py-1 px-2"
                    onChange={(e) => setNewFromUserID(e.target.value)}
                    value={newFromUserID}
                >
                    <option value="" disabled>From...</option>
                    {users.map((user) => (
                        <option key={user.id} value={user.id}
                                disabled={user.id === newToUserID}>
                            {truncateLongNames(user.name)}
                        </option>
                    ))}
                </select>

                <div className="flex flex-row items-center space-x-2">
                    <PiArrowDown className="text-xl"/>
                    <input
                        type="text"
                        className="border rounded py-1 px-2 w-20"
                        id="amount"
                        value={newAmount}
                        onChange={(e) => {
                            if (/^\d*\.?\d{0,2}$/.test(e.target.value)) setNewAmount(e.target.value);
                        }}
                        placeholder="0.00"
                    />
                    <PiArrowDown className="text-white text-xl"/>
                </div>

                <select
                    id="userDropdown"
                    className="border rounded py-1 px-2"
                    onChange={(e) => setNewToUserID(e.target.value)}
                    value={newToUserID}
                >
                    <option value="" disabled>To...</option>
                    {users.map((user) => (
                        <option key={user.id} value={user.id}
                                disabled={user.id === newFromUserID}>
                            {truncateLongNames(user.name)}
                        </option>
                    ))}
                </select>
            </div>

            {convertStrToInt(newAmount) !== 0 && newToUserID !== '' && newFromUserID !== '' &&
                <div className="mt-5 flex flex-col items-center w-full space-y-2 px-3">
                    <input
                        type="text"
                        className="border rounded py-1 px-2 w-full md:w-3/4"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder="Description"
                    />
                </div>
            }

            {newItemError && <div className="w-full text-center text-red-500">{newItemError}</div>}

            <button
                className={`${
                    convertStrToInt(newAmount) !== 0 && newToUserID !== '' && newFromUserID !== ''
                        ? "bg-green-500 hover:bg-green-700"
                        : "bg-gray-300"
                } text-white font-bold py-1 px-2 rounded w-full m-auto`}
                onClick={handleNewTransfer}
                disabled={!(convertStrToInt(newAmount) !== 0 && newToUserID !== '' && newFromUserID !== '')}
            >
                Post
            </button>
        </div>;
    }

    function getUserTile(user) {
        return (
            <li
                key={user.id}
                className="rounded border border-gray-300 flex items-center justify-between px-2 bg-white shadow-md hover:shadow-lg transition-shadow duration-300 space-x-4"
            >
                <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-blue-600">{user.name}</span>
                    {user.id === loggedUserId && (
                        <span className="text-sm text-blue-400">(me)</span>
                    )}
                </div>
                <span className="text-gray-700">{getUserAmountComponent(user.id)}</span>
            </li>
        );
    }


    function getItemTile(item, gitem) {
        return (
            <li
                key={item.id}
                className="text-sm flex justify-between items-center px-2 py-1 border border-gray-300 rounded bg-white shadow-md hover:shadow-lg transition-shadow duration-300"
            >
                <div className={windowWidth > thresholdWidth ? "flex space-x-4 items-center" : "flex flex-col space-y-2"}>
                    {gitem.type === "TRANSFER" ? (
                        <div className="flex items-center space-x-1">
                        <span className="text-blue-600 max-w-28 truncate md:max-w-0">
                            {userMap.get(item.to_user_id)}
                        </span>
                            <span className="text-gray-500">paid</span>
                            <span className="font-bold">{convertIntToStr(item.amount)}</span>
                            <span className="text-gray-500">to</span>
                        <span className="text-blue-600 max-w-24 truncate">
                            {userMap.get(item.from_user_id)}
                        </span>
                        </div>
                    ) : (
                        <div className="flex items-center space-x-1">
                        <span className="text-blue-600 max-w-28 truncate">
                            {userMap.get(item.from_user_id)}
                        </span>
                            <span className="text-gray-500">owes</span>
                            <span className="font-bold">{convertIntToStr(item.amount)}</span>
                            <span className="text-gray-500">to</span>
                            <span className="text-blue-600 max-w-24 truncate">
                            {userMap.get(item.to_user_id)}
                        </span>
                        </div>
                    )}
                </div>
                {windowWidth > thresholdWidth && <button
                    className="hover:text-red-500 text-gray-400 font-bold rounded transition-colors duration-300"
                    onClick={() => handleDeleteItem(item.id)}
                >
                    X
                </button>}
            </li>
        );
    }


    function getGroupTile(gitem) {
        return (
            <li
                key={gitem.group_id}
                className={`
        ${gitem.type === "TRANSFER" && "bg-green-50"} 
        ${gitem.type === "INCOME" && "bg-purple-50"} 
        ${gitem.type === "EXPENSE" && "bg-orange-50"} 
        flex justify-between items-center py-2 pb-2 px-2 border border-gray-300 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300
    `}
            >
                <div className="space-y-1 w-full text-sm">
                    <div className="flex items-start justify-between w-full">
                        <div className="flex-col ml-1">
                            <div className="flex items-center space-x-2 flex-grow">
                                <span className="font-bold max-w-56 truncate">{gitem.name}</span>
                            </div>
                            <div className="space-x-2">
                                <span className={`
                                    ${gitem.type === "TRANSFER" && "text-green-600"}
                                    ${gitem.type === "INCOME" && "text-purple-600"}
                                    ${gitem.type === "EXPENSE" && "text-orange-600"}
                                    font-bold
                                `}>
                                    {convertIntToStr(gitem.amount)}
                                </span>
                                <span className="text-gray-500 w-32 text-right">
                                    {formatDateTime(gitem.time)}
                                </span>
                                {gitem.type === "EXPENSE" && <span className="text-purple-600">
                                    {userMap.get(gitem.user_id)}
                                </span>}
                                {gitem.type === "INCOME" && <span className="text-orange-600">
                                    {userMap.get(gitem.user_id)}
                                </span>}
                            </div>
                        </div>
                        <button
                            className="hover:text-red-500 text-gray-700 font-bold px-2 rounded transition-colors duration-300"
                            onClick={() => handleDeleteGroup(gitem.group_id)}
                        >
                            X
                        </button>
                    </div>

                    <ul className="w-full">
                        {gitem.items.map((item) => getItemTile(item, gitem))}
                    </ul>
                </div>
            </li>

        );
    }

    function getSettlementTile(item) {
        return (
            <li
                key={item.id}
                className={`text-sm px-2 py-1 border border-gray-300 rounded shadow-md 
                    hover:shadow-lg transition-shadow duration-300 flex
                    md:space-x-2
                    ${windowWidth < thresholdWidth ? "flex-col" : ""}`}
            >
                    <span className="text-orange-600 font-medium">{userMap.get(item.from_user_id)}</span>
                    <span className="flex items-center">
                        <span className="text-gray-500">pays</span>
                        <span className="font-bold mx-1">{convertIntToStr(item.amount)}</span>
                        <span className="text-gray-500">to</span>
                    </span>
                    <span className="text-purple-600 font-medium">{userMap.get(item.to_user_id)}</span>
                    <span className="md:flex-grow"></span>
                <button
                    className="ml-auto text-sm underline text-green-600 hover:text-green-500 transition-colors duration-300"
                    onClick={() => handleSettle(item)}
                >
                    Settle
                </button>
            </li>
        );
    }

    const copyToClipboard = async (text) => {
        if (navigator?.clipboard?.writeText) {
            try {
                await navigator.clipboard.writeText(text);
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            } catch (err) {
                console.error("Failed to copy: ", err);
            }
        } else {
            // Fallback (deprecated but works widely)
            const textarea = document.createElement("textarea");
            textarea.value = text;
            textarea.style.position = "fixed"; // prevent scrolling
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            try {
                document.execCommand("copy");
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 3000);
            } catch (err) {
                console.error("Fallback copy failed", err);
            }
            document.body.removeChild(textarea);
        }
    };

    return (
        globalError !== '' ? NotFoundPage(globalError) :
            <div className="min-h-screen bg-gray-100" style={{minWidth: `${minWidth}px`}}>
                {/* Top Bar */}
                <div className="bg-blue-600 text-white flex justify-between items-center px-4 py-3 h-12">
                    <div className="flex space-x-3 items-center">
                        <button
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded"
                            onClick={handleBackToHome}>
                            <BsCaretLeftFill/>
                        </button>
                        {/* Room Name */}
                        <div className="pl-0 text-lg font-semibold">
                            {roomName}
                        </div>
                        <button onClick={() => copyToClipboard(roomID)}
                            className="text-sm bg-blue-500 hover:bg-blue-700 text-white py-0 px-3 rounded">
                            {isCopied ? "Copied" : "Copy ID"}
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
                    <div className="p-3">
                        {/* Users List */}
                        <div className="bg-white shadow-md rounded p-3 mb-4 space-y-2">
                            <button className="flex space-x-2" onClick={() => setShowUsers(!showUsers)}>
                                <h3 className={`text-lg font-semibold ${showUsers && "mb-1"}`}>
                                    Users
                                </h3>
                                <h3 className="text-gray-400 mt-0.5 ml-3">{showUsers ? '▲' : '▼'}</h3>
                            </button>
                            {showUsers && <ul className="list-disc list-inside space-y-1">
                                {users.map((user) => getUserTile(user))}
                            </ul>}
                        </div>

                        {/* Items List */}
                        <div className="bg-white shadow-md rounded p-3 mb-4">
                            <button className="flex space-x-2" onClick={() => setShowTransactions(!showTransactions)}>
                                <h3 className={`text-lg font-semibold ${showTransactions && "mb-4"}`}>Transactions</h3>
                                <h3 className="text-gray-400 mt-0.5 ml-3">{showTransactions ? '▲' : '▼'}</h3>
                            </button>

                            {showTransactions && <div>
                                {/* New Item Menu */}
                                <div className="mb-8 border-2 p-0 space-y-2 rounded">
                                    {/* Tabs Header */}
                                    <div className="flex border-b border-gray-300">
                                        {tabs.map((tab, index) => (
                                            <button
                                                key={index}
                                                className={`flex-1 py-1.5 px-4 text-center focus:outline-none ${
                                                    activeTab === tab
                                                        ? 'border-b-4 border-blue-500 text-blue-600 font-semibold text-sm'
                                                        : 'text-gray-600 hover:text-blue-500 text-sm'
                                                }`}
                                                onClick={() => setActiveTab(tab)}
                                            >
                                                {tab}
                                            </button>
                                        ))}
                                    </div>


                                    {activeTab === tabs[0] ?
                                        // Split expense
                                        getExpenseForm() :
                                        activeTab === tabs[1] ?
                                            // Split income
                                            getIncomeForm() :
                                            // Transfer from one user to another
                                            getTransferForm()}
                                </div>

                                {/* Item List */}
                                <ul className="space-y-3">
                                    {groupedItems.map((gitem, _) => getGroupTile(gitem))}
                                </ul>
                            </div>}
                        </div>

                        {/* Settlements Section */}
                        <div className="bg-white shadow-md rounded p-3 mb-2">
                            <button className="flex space-x-2" onClick={() => setShowSettlements(!showSettlements)}>
                                <h3 className={`text-lg font-semibold ${showSettlements && "mb-4"}`}>Settlements</h3>
                                <h3 className="text-gray-400 mt-0.5 ml-3">{showSettlements ? '▲' : '▼'}</h3>
                            </button>
                            {showSettlements && <div>
                                {/*<div className="space-x-4 mb-4 border p-2">*/}
                                {/*    <span className="text-lg">Algo:</span>*/}
                                {/*    <button*/}
                                {/*        className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"*/}
                                {/*        onClick={() => handleSimplify(0)}*/}
                                {/*    >*/}
                                {/*        Reset*/}
                                {/*    </button>*/}
                                {/*    <button*/}
                                {/*        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"*/}
                                {/*        onClick={() => handleSimplify(1)}*/}
                                {/*    >*/}
                                {/*        Greedy*/}
                                {/*    </button>*/}
                                {/*    <button*/}
                                {/*        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"*/}
                                {/*        onClick={() => handleSimplify(2)}*/}
                                {/*    >*/}
                                {/*        Preserve*/}
                                {/*    </button>*/}
                                {/*</div>*/}
                                <ul className="space-y-2">
                                    {simplifiedItems.length === 0 && <div className="text-green-600">All settled up!</div>}
                                    {simplifiedItems.map((item) => getSettlementTile(item))}
                                </ul>
                            </div>}
                        </div>
                    </div>
                </div>
    );
};

export default RoomPage;
