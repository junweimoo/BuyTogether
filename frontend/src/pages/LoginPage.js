import React, {useEffect, useState} from "react";
import api from "../Api";
import Cookies from "js-cookie";
import {useNavigate} from "react-router-dom";

const LoginPage = () => {
    const [showRegister, setShowRegister] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newPasswordSecond, setNewPasswordSecond] = useState('');
    const [registerUserError, setRegisterUserError] = useState('');
    const [registerUserSuccess, setRegisterUserSuccess] = useState('');

    const [loginUsername, setLoginUsername] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginUserError, setLoginUserError] = useState('');

    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const thresholdWidth = 650;
    const minWidth = 400;

    const navigate = useNavigate();

    const handleRegisterUser = () => {
        if (newUsername.trim() && newPassword.trim()) {
            if (newPassword !== newPasswordSecond) {
                setRegisterUserError('Your passwords did not match');
                return;
            }
            api.post('/users/register', { name: newUsername, password_hash: newPassword })
                .then(response => {
                    setNewUsername("");
                    setNewPassword("");
                    setNewPasswordSecond("");
                    setRegisterUserSuccess(true);
                    setRegisterUserError('');
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
                    setLoginUsername("");
                    setLoginPassword("");

                    Cookies.set('session_user', JSON.stringify({
                        userId: response.data.user.id,
                        username: response.data.user.name,
                        jwt: response.data.token
                    }), { expires: 1 });

                    navigate("/");
                })
                .catch(error => {
                    console.error('Error while logging in:', error);
                    setLoginUserError(error.response.data);
                })
        }
    }

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        setWindowWidth(window.innerWidth);

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div style={{ minWidth: `${minWidth}px` }}>
            <div className="bg-blue-600 text-white flex justify-between items-center px-6 py-3 h-12">
                <div className="text-xl font-semibold">
                    {windowWidth > thresholdWidth ? "BuyTogether" : "BT"}
                </div>
                <button
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 text-sm rounded"
                    onClick={() => setShowRegister(!showRegister)}
                >
                    {showRegister ? "Login" : "Register"}
                </button>
            </div>
            <div className="mx-4 p-6 bg-white shadow-md rounded mt-4">
                {showRegister ? (
                    <div>
                        <h3 className="text-2xl font-bold mb-4">Register</h3>
                        <input
                            type="text"
                            className="border rounded w-full p-2 mb-4"
                            value={newUsername}
                            onChange={(e) => setNewUsername(e.target.value)}
                            placeholder="Enter Username"
                        />
                        <input
                            type="password"
                            className="border rounded w-full p-2 mb-4"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter Password"
                        />
                        <input
                            type="password"
                            className="border rounded w-full p-2 mb-4"
                            value={newPasswordSecond}
                            onChange={(e) => setNewPasswordSecond(e.target.value)}
                            placeholder="Confirm Password"
                        />
                        <button
                            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded w-full"
                            onClick={handleRegisterUser}
                        >
                            Register
                        </button>
                        {registerUserError && <div className="text-red-500 mt-2">{registerUserError}</div>}
                        {registerUserSuccess && <div
                            className="text-green-600 mt-2">Account created! You may now <span
                            className="text-blue-500" onClick={() => setShowRegister(false)}>login</span>.
                        </div>}
                    </div>
                ) : (
                    <div>
                        <h3 className="text-2xl font-bold mb-4">Login</h3>
                        <input
                            type="text"
                            className="border rounded w-full p-2 mb-4"
                            value={loginUsername}
                            onChange={(e) => setLoginUsername(e.target.value)}
                            placeholder="Enter Username"
                        />
                        <input
                            type="password"
                            className="border rounded w-full p-2 mb-4"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            placeholder="Enter Password"
                        />
                        <button
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full"
                            onClick={handleLoginUser}
                        >
                            Login
                        </button>
                        {loginUserError && <div className="text-red-500 mt-2">{loginUserError}</div>}
                    </div>
                )}
            </div>
        </div>
    );
}

export default LoginPage;