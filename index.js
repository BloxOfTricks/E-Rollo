import express from 'express';
import fs from 'fs';
import fetch from 'node-fetch';
import session from 'express-session';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true
}));

const OWNER_ID = process.env.OWNER_ID;
const DB_FILE = "./commands.json";

// Serve static frontend
app.use(express.static("public"));

// OAuth2 login route
app.get("/login", (req, res) => {
    const redirect = `https://discord.com/api/oauth2/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.REDIRECT_URI)}&response_type=code&scope=identify`;
    res.redirect(redirect);
});

// OAuth2 callback
app.get("/callback", async (req, res) => {
    const code = req.query.code;
    const data = new URLSearchParams({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.REDIRECT_URI,
        scope: "identify"
    });

    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        body: data,
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });

    const tokenData = await tokenRes.json();
    const userRes = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const user = await userRes.json();

    if (user.id === OWNER_ID) {
        req.session.user = user;
        res.redirect("/edit.html");
    } else {
        res.send("You are not authorized to use this site.");
    }
});

// Save command
app.post("/saveCommand", (req, res) => {
    if (!req.session.user || req.session.user.id !== OWNER_ID) return res.status(403).send("Forbidden");

    const { name, description, code } = req.body;
    const commands = fs.existsSync(DB_FILE)
        ? JSON.parse(fs.readFileSync(DB_FILE, "utf8"))
        : [];

    commands.push({ name, description, command: `/${name}`, code });
    fs.writeFileSync(DB_FILE, JSON.stringify(commands, null, 2));
    res.json({ success: true });
});

// Public list of commands
app.get("/commands", (req, res) => {
    const commands = fs.existsSync(DB_FILE)
        ? JSON.parse(fs.readFileSync(DB_FILE, "utf8"))
        : [];
    res.json(commands);
});

app.listen(3000, () => console.log("Server running on port 3000"));
