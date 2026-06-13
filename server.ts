import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { google } from "googleapis";

interface Meeting {
  id: string;
  name: string;
  mobile: string;
  email: string;
  date: string;
  time: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  meetLink?: string;
  createdAt: string;
}

const DATA_FILE = path.join(process.cwd(), 'data.json');

function getMeetings(): Meeting[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading data.json:', error);
  }
  return [];
}

function saveMeetings(meetings: Meeting[]) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(meetings, null, 2));
  } catch (error) {
    console.error('Error writing to data.json:', error);
  }
}

async function createGoogleMeet(name: string, email: string, mobile: string, date: string, time: string): Promise<string> {
  // If properly configured in production environment with a Service Account
  if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    try {
      const auth = new google.auth.JWT({
        email: process.env.GOOGLE_CLIENT_EMAIL,
        key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/calendar.events'],
      });

      const calendar = google.calendar({ version: 'v3', auth });
      const startDateTime = new Date(`${date}T${time}:00`).toISOString();
      const endDateTime = new Date(new Date(startDateTime).getTime() + 60 * 60 * 1000).toISOString();

      const response = await calendar.events.insert({
        calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
        conferenceDataVersion: 1,
        requestBody: {
          summary: `Meeting with ${name}`,
          description: `Mobile: ${mobile}`,
          start: { dateTime: startDateTime },
          end: { dateTime: endDateTime },
          conferenceData: {
            createRequest: {
              requestId: Math.random().toString(36).substring(7),
              conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
          },
          attendees: email ? [{ email }] : [],
        },
      });

      if (response.data.hangoutLink) {
         return response.data.hangoutLink;
      }
    } catch (err) {
      console.error("Error creating Google Meet via API:", err);
    }
  }

  // Graceful fallback for preview / unconfigured environments
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const genCode = (len: number) => Array.from({length: len}).map(() => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
  return `https://meet.google.com/${genCode(3)}-${genCode(4)}-${genCode(3)}`;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/meetings", async (req, res) => {
    const { name, mobile, email, date, time } = req.body;
    
    // Automatically generate meet link
    const meetLink = await createGoogleMeet(name, email, mobile, date, time);
    
    const meetings = getMeetings();
    const newMeeting: Meeting = {
      id: Math.random().toString(36).substring(7),
      name,
      mobile,
      email,
      date,
      time,
      status: 'scheduled',
      meetLink,
      createdAt: new Date().toISOString()
    };
    meetings.push(newMeeting);
    saveMeetings(meetings);
    res.status(201).json(newMeeting);
  });

  app.get("/api/meetings", (req, res) => {
    res.json(getMeetings());
  });

  app.patch("/api/meetings/:id/status", (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    const meetings = getMeetings();
    const meeting = meetings.find(m => m.id === id);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    if (['scheduled', 'completed', 'cancelled'].includes(status)) {
      meeting.status = status;
      saveMeetings(meetings);
      res.json(meeting);
    } else {
      res.status(400).json({ error: 'Invalid status' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
