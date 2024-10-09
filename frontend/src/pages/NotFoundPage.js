const NotFoundPage = ( errorMsg ) => {
    return (
        <div>
            <h1>Oops</h1>
            <h3>{`${errorMsg}`}</h3>
        </div>
    );
};

export default NotFoundPage;