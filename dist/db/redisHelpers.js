export const generateRandomStringPrefix = (payload) => {
    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 5; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        result += charset[randomIndex];
    }
    ;
    return result + payload;
};
export const removeRandomStringPrefixs = (arrayOfMessages) => {
    return arrayOfMessages.map(message => message.slice(5));
};
