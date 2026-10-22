# WearWise 

A small app to organize your wardrobe and pick a random outfit (OOTD).
It runs on your own computer. Your photos and data never leave it.

## What you need (one time only)

**Python 3**: download it free from <https://www.python.org/downloads/>

- **Windows:** during install, tick **"Add python.exe to PATH"** before clicking Install.
- **Mac:** just run the installer.

## First-time setup

1. Unzip the ` WearWise` folder somewhere easy (like your Desktop).
   Inside you should see `app.py` and a folder called `static`.

2. Open a terminal inside that folder, then type the commands one at a time, pressing Enter after each.

### Windows

Open the folder in File Explorer, click the address bar at the top, type `cmd` and press Enter. Then:

```
python -m venv venv
venv\Scripts\activate
python app.py
```

### Mac

Open the **Terminal** app, type `cd` and a space, drag the `WearWise` folder into the Terminal window, and press Enter. Then:

```
python3 -m venv venv
source venv/bin/activate
python app.py
```

3. When you see `Running on http://127.0.0.1:5000`, open your web browser and go to:

   **http://127.0.0.1:5000**

4. The first time, type your name. Next time you'll see "Welcome back, [Name]!!!"

## Next times

You only need to do the setup once. To open the app again, open a terminal in the folder, then:

| Windows | Mac |
|---|---|
| `venv\Scripts\activate` | `source venv/bin/activate` |
| `python app.py` | `python app.py` |

Then go to <http://127.0.0.1:5000> in your browser.

To quit, go back to the terminal window and press **Ctrl + C**.

## Your data

Your wardrobe is saved in the folder next to `app.py`:

- `data.json`: your name and clothing tags
- `uploads/`: your clothing photos

Keep these to keep your wardrobe. Delete them to start fresh.

## If something goes wrong

- **"python is not recognized" (Windows):** reinstall Python and tick "Add python.exe to PATH".
- **`venv\Scripts\activate` is blocked in PowerShell:** use Command Prompt instead (type `cmd` in the address bar, as in step 2).
- **Page says "Not found":** make sure the `static` folder is next to `app.py` and has `index.html`, `style.css` and `script.js` inside.
- **"Access denied" or 403 on a Mac:** macOS uses port 5000 for AirPlay. Turn it off in System Settings > General > AirDrop & Handoff > AirPlay Receiver, then run the app again.
- **"Address already in use":** the app is probably already running in another terminal window. Close that one first.
