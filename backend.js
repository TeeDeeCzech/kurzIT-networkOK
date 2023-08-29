const API_PORT = 3000;
const mongoose = require("mongoose");
const Joi = require('joi');
const express = require('express');
const expressSession = require("express-session");
const bcrypt = require("bcrypt")
const app = express();
const cors = require('cors');
app.use(express.json());
// Přidání middleware pro CORS
app.use(cors({
    origin: 'http://localhost:63342', // Povolíte původ z vaší webové aplikace
    credentials: true // Povolíte přenos cookies a dalších autentizačních informací
}));
app.use(expressSession({
    secret: "a/#$sd#0$",
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true
    }
}));
app.listen(API_PORT, () => console.log('Listening on port ' + API_PORT + '...'));

// DB connection ----------------------------------------------------------
mongoose
    .connect("mongodb://127.0.0.1:27017/insurancedb", {useNewUrlParser: true})
    .then(() => console.log("Connected to MongoDB!"))
    .catch(error => console.error("Could not connect to MongoDB... ", error));

// Mongoose schema ------------------------------------------------------
const insuredSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    street: String,
    city: String,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    phone: Number,
    isAdmin: { type: Boolean, default: false },
    events: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }]
});

const insuranceSchema = new mongoose.Schema({
    type: String,
    amount: Number,
    validFrom: Date,
    validTo: Date,
    insured: { type: mongoose.Schema.Types.ObjectId, ref: 'Insured' },
    isPaid: { type: Boolean, default: false },
    events: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }]
});

const userSchema = new mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    email: String,
    passwordHash: String,
    isAdmin: { type: Boolean, default: false }
});

const eventSchema = new mongoose.Schema({
    text: String,
    price: Number
});

const Insured = mongoose.model("Insured", insuredSchema);
const Insurance = mongoose.model("Insurance", insuranceSchema);
const User = mongoose.model("User", userSchema);
const Event = mongoose.model("Event", eventSchema);
// Validation funkce --------------------------------------------------------
function validateInsured(insured, required = true) {
    const schema = Joi.object({
        firstName: Joi.string().min(3),
        lastName: Joi.string().min(3),
        street: Joi.string(),
        city: Joi.string(),
        email: Joi.string().email(),
        phone: Joi.number(),
    });

    return schema.validate(insured, {presence: (required) ? "required" : "optional"});
}
function validateInsurance(insurance, required = true) {
    const schema = Joi.object({
        type: Joi.string().min(3),
        subject: Joi.string().min(5),
        validFrom: Joi.date(),
        validTo: Joi.date(),
        insured: Joi.string().min(5),

    });

    return schema.validate(insurance, {presence: (required) ? "required" : "optional"});
}
function validateEvent(event, required = true) {
    const schema = Joi.object({
        text: Joi.string().min(3),
        price: Joi.number().min(1)
    });

    return schema.validate(event, { presence: (required) ? "required" : "optional" });
}


// Hash funkce --------------------------------------------------------------
function hashPassword(password, saltRounds = 10) {
    return bcrypt.hashSync(password, saltRounds);
}

function verifyPassword(passwordHash, password) {
    return bcrypt.compareSync(password, passwordHash);
}

// Middleware pro ověření role uživatele ----------------------------------------
function isAdmin(req, res, next) {
    const user = req.session.user;
    if (user && user.isAdmin) {
        next();
    } else {
        res.status(403).send("Nemáte dostatečná práva k této akci.");
    }
}

function isUser(req, res, next) {
    const user = req.session.user;
    if (user && !user.isAdmin) {
        next();
    } else {
        res.status(403).send("Tato akce je dostupná pouze běžným uživatelům.");
    }
}

// Session functions -----------------------------------------------------------
function getPublicSessionData(sessionData) {
    const allowedKeys = ["_id", "email", "isAdmin"];
    const entries = allowedKeys
        .map(key => [key, sessionData[key]]);
    return Object.fromEntries(entries);
}

// Route handlers --------------------------------------------------------------
const requireAuthHandler = (req, res, next) => {
    const user = req.session.user;
    if (!user) {
        res.status(401).send("Nejprve se přihlaste1");
        return;
    }
    // Ověření uživatele na základě kompletního objektu z session
    User.findById(user._id)
        .then((foundUser) => {
            if (!foundUser) {
                req.session.destroy((err) => {
                    if (err) {
                        res.status(500).send("Nastala chyba při autentizaci");
                        return;
                    }
                    res.status(401).send("Nejprve se přihlaste");
                });
                return;
            }
            // Všechno je v pořádku, pokračujeme
            next();
        })
        .catch(() => {
            res.status(500).send("Nastala chyba při autentizaci");
        });
};

const requireAdminHandlers = [
    requireAuthHandler,
    (req, res, next) => {
        const user = req.session.user;
        if (!user.isAdmin) {
            res.status(403).send("Nemáte dostatečná práva");
            return;
        }
        next();
    }
];

// Registrace uzivatele ----------------------------------------------------------------
app.post('/api/register', (req, res) => {
    const { email, password } = req.body;
    if(!email || !password) return res.status(400).send("E-mail a heslo jsou povinné.");

    const passwordHash = hashPassword(password);
    const userId = new mongoose.Types.ObjectId(); // Vygenerování nového ObjectId

    const user = new User({ _id: userId, email, passwordHash });

    user.save()
        .then(result => res.json({ message: "Registrace byla úspěšná!", userId: userId }))
        .catch(err => res.status(400).send("Chyba při registraci."));
});


// Login uzivatel ----------------------------------------------------------------
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).send("E-mail a heslo jsou povinné.");

    User.findOne({ email })
        .then(user => {
            if (!user || !verifyPassword(user.passwordHash, password)) return res.status(401).send("Nesprávný e-mail nebo heslo.");

            req.session.user = user; // Uložení kompletního objektu uživatele do session
            res.json({ ...user, userId: user._id });
        })
        .catch(err => res.status(400).send("Chyba při přihlášení."));
});



// logout uzivatel  ----------------------------------------------------------------
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: "Odhlášení bylo úspěšné." });
});

// POST request pro administrátora  --------------------------------------------------
app.post('/api/set-admin/:userId', [requireAuthHandler, isAdmin], (req, res) => {
    User.findByIdAndUpdate(req.params.userId, { isAdmin: true }, { new: true })
        .then(user => {
            if (user) res.json(user);
            else res.status(404).send("Uživatel s daným ID nebyl nalezen.");
        })
        .catch(err => {
            res.status(400).send("Chyba při nastavování uživatele jako administrátora.");
        });
});

// GET pojištěného podle ID uzivatel ----------------------------------------------------------------
app.get('/api/insured/:id', requireAuthHandler, isUser, (req, res) => {
    if(req.params.id !== req.session.user._id) {
        return res.status(403).send("Nemáte oprávnění prohlížet tento záznam.");
    }

    Insured.findById(req.params.id)
        .populate('insurances')
        .then(insured => {
            if (insured)
                res.send(insured);
            else
                res.status(404).send("Pojištěný s daným id nebyl nalezen!");
        })
        .catch(err => {
            res.status(400).send("Chyba požadavku GET na pojištěného!");
        });
});

app.get('/api/insured/:id/insurances', requireAuthHandler, isUser, (req, res) => {
    if(req.params.id !== req.session.user._id) {
        return res.status(403).send("Nemáte oprávnění prohlížet tuto databázi pojištění.");
    }

    Insurance.find({ insured: req.params.id })
        .then(insurances => {
            res.json(insurances);
        })
        .catch(err => {
            res.status(400).send("Chyba požadavku GET na pojištění pojištěného!");
        });
});

// GET všechny pojištěné ----------------------------------------------------------------
app.get('/api/all-insured', requireAuthHandler, isAdmin, (req, res) => {
    Insured.find({})
        .then(insureds => {
            res.send(insureds);
        })
        .catch(err => {
            res.status(400).send("Chyba při načítání všech pojištěnců.");
        });
});

// GET všechna pojištění ----------------------------------------------------------------
app.get('/api/all-insurances', requireAuthHandler, isAdmin, (req, res) => {
    Insurance.find({})
        .then(insurances => {
            res.send(insurances);
        })
        .catch(err => {
            res.status(400).send("Chyba při načítání všech pojištění.");
        });
});


// POST request pro vytvoření pojištěného a jeho pojištění ----------------------------------------------------------------
app.post('/api/insured', requireAuthHandler, isUser, (req, res) => {
    const { error } = validateInsured(req.body);
    if (error) {
        res.status(400).send(error.details[0].message);
    } else {
        Insured.create(req.body)
            .then(insured => {
                res.json(insured);
            })
            .catch(err => {
                res.send("Nepodařilo se uložit pojištěného!");
            });
    }
});

// POST dela uzivatel jako registraci a admin muze take  ----------------------------------------------------------------
app.post('/api/insured/:id/insurances', requireAuthHandler, isUser, (req, res) => {
    const { error } = validateInsurance(req.body);
    if (error) {
        res.status(400).send(error.details[0].message);
    } else {
        req.body.insured = req.params.id;
        Insurance.create(req.body)
            .then(insurance => {
                res.json(insurance);
            })
            .catch(err => {
                res.send("Nepodařilo se uložit pojištění!");
            });
    }
});

// PUT pro admina ----------------------------------------------------------------
app.put('/api/insured/:id', requireAuthHandler, (req, res) => {
    if (req.session.user.isAdmin || req.params.id === req.session.user._id) {
        const { error } = validateInsured(req.body, false);
        if (error) {
            res.status(400).send(error.details[0].message);
        } else {
            Insured.findByIdAndUpdate(req.params.id, req.body, { new: true })
                .then(insured => {
                    res.json(insured);
                })
                .catch(err => {
                    res.status(400).send("Chyba při aktualizaci pojištěného!");
                });
        }
    } else {
        res.status(403).send("Nemáte oprávnění upravit tento záznam.");
    }
});


app.put('/api/insurances/:id', requireAuthHandler, (req, res) => {
    Insurance.findById(req.params.id)
        .then(insurance => {
            if (insurance) {
                if (req.session.user.isAdmin || String(insurance.insured) === req.session.user._id) {
                    const { error } = validateInsurance(req.body, false);
                    if (error) {
                        res.status(400).send(error.details[0].message);
                        return;
                    }
                    Object.assign(insurance, req.body);
                    insurance.save()
                        .then(updatedInsurance => {
                            res.json(updatedInsurance);
                        })
                        .catch(err => {
                            res.status(400).send("Chyba při aktualizaci pojištění!");
                        });
                } else {
                    res.status(403).send("Nemáte oprávnění upravit toto pojištění.");
                }
            } else {
                res.status(404).send("Pojištění s daným id nebylo nalezeno!");
            }
        })
        .catch(err => {
            res.status(400).send("Chyba při hledání pojištění!");
        });
});



// DELETE request pro odstranění pojištění
app.delete('/api/insurances/:id', requireAuthHandler, isAdmin, (req, res) => {
    Insurance.findById(req.params.id)
        .then(insurance => {
            if (insurance) {
                if (req.session.user.isAdmin || String(insurance.insured) === req.session.user._id) {
                    insurance.remove()
                        .then(() => res.json({ message: 'Pojištění úspěšně odstraněno' }))
                        .catch(err => res.status(400).send("Chyba při mazání pojištění!"));
                } else {
                    res.status(403).send("Nemáte oprávnění smazat toto pojištění.");
                }
            } else {
                res.status(404).send("Pojištění s daným id nebylo nalezeno!");
            }
        })
        .catch(err => {
            res.status(400).send("Chyba při hledání pojištění!");
        });
});

// DELETE request pro odstranění pojištěného
app.delete('/api/insured/:id', requireAdminHandlers, isAdmin, (req, res) => {
    Insured.findById(req.params.id)
        .then(insured => {
            if (insured) {
                insured.remove()
                    .then(() => res.json({ message: 'Pojištěný úspěšně odstraněn' }))
                    .catch(err => res.status(400).send("Chyba při mazání pojištěného!"));
            } else {
                res.status(404).send("Pojištěný s daným id nebyl nalezen!");
            }
        })
        .catch(err => {
            res.status(400).send("Chyba při hledání pojištěného!");
        });
});

// Označení pojištění jako zaplacené -----------------------------------------------------------------
app.put('/api/insurances/:id/mark-as-paid', requireAuthHandler, (req, res) => {
    Insurance.findById(req.params.id)
        .then(insurance => {
            if (insurance) {
                if (req.session.user.isAdmin || String(insurance.insured) === req.session.user._id) {
                    insurance.isPaid = true; // Nastavení isPaid na true
                    insurance.save()
                        .then(updatedInsurance => {
                            res.json(updatedInsurance);
                        })
                        .catch(err => {
                            res.status(400).send("Chyba při označování pojištění jako zaplaceného!");
                        });
                } else {
                    res.status(403).send("Nemáte oprávnění označit toto pojištění jako zaplacené.");
                }
            } else {
                res.status(404).send("Pojištění s daným id nebylo nalezeno!");
            }
        })
        .catch(err => {
            res.status(400).send("Chyba při hledání pojištění!");
        });
});
// GET detailu pojištěnce včetně jeho pojistek ----------------------------------------------
app.get('/api/insured/:id/details-with-insurances', requireAuthHandler, (req, res) => {
    if (req.params.id !== req.session.user._id && !req.session.user.isAdmin) {
        return res.status(403).send("Nemáte oprávnění prohlížet tento záznam.");
    }

    Insured.findById(req.params.id)
        .populate({
            path: 'insurances',
            populate: {
                path: 'events',
                model: 'Event'
            }
        })
        .then(insured => {
            if (insured) {
                res.send(insured);
            } else {
                res.status(404).send("Pojištěný s daným id nebyl nalezen!");
            }
        })
        .catch(err => {
            res.status(400).send("Chyba požadavku GET na detail pojištěného včetně pojistek a událostí!");
        });
});
// Vytvoreni pojistne udalosti
app.post('/api/events', requireAdminHandlers, (req, res) => {
    const { error } = validateEvent(req.body);
    if (error) {
        res.status(400).send(error.details[0].message);
        return;
    }

    const { text, price } = req.body;
    const event = new Event({ text, price });

    event.save()
        .then(newEvent => {
            res.json(newEvent);
        })
        .catch(err => {
            res.status(400).send("Chyba při vytváření pojistné události!");
        });
});
// Aktualizace pojistne udalosti
app.put('/api/events/:eventId', requireAdminHandlers, (req, res) => {
    const { error } = validateEvent(req.body);
    if (error) {
        res.status(400).send(error.details[0].message);
        return;
    }

    const { text, price } = req.body;

    Event.findByIdAndUpdate(req.params.eventId, { text, price }, { new: true })
        .then(updatedEvent => {
            if (updatedEvent) {
                res.json(updatedEvent);
            } else {
                res.status(404).send("Pojistná událost s daným ID nebyla nalezena!");
            }
        })
        .catch(err => {
            res.status(400).send("Chyba při aktualizaci pojistné události!");
        });
});
// Odstraněni pojistne udalosti
app.delete('/api/events/:eventId', requireAdminHandlers, (req, res) => {
    Event.findByIdAndRemove(req.params.eventId)
        .then(deletedEvent => {
            if (deletedEvent) {
                res.json({ message: 'Pojistná událost úspěšně odstraněna' });
            } else {
                res.status(404).send("Pojistná událost s daným ID nebyla nalezena!");
            }
        })
        .catch(err => {
            res.status(400).send("Chyba při odstraňování pojistné události!");
        });
});
// Generování reportu pro statistiky -----------------------------------------------------------------------------
app.get('/api/generate-report', requireAdminHandlers, async (req, res) => {
    try {
        // Získání všech pojištěných z databáze
        const insureds = await Insured.find({}).populate({
            path: 'insurances',
            populate: {
                path: 'events',
                model: 'Event'
            }
        });

        // Generování reportu
        const report = [];
        for (const insured of insureds) {
            const reportRow = {
                firstName: insured.firstName,
                lastName: insured.lastName,
                insurances: []
            };

            for (const insurance of insured.insurances) {
                const insuranceRow = {
                    type: insurance.type,
                    amount: insurance.amount,
                    validFrom: insurance.validFrom,
                    validTo: insurance.validTo,
                    isPaid: insurance.isPaid,
                    events: []
                };

                for (const event of insurance.events) {
                    insuranceRow.events.push({
                        text: event.text,
                        price: event.price
                    });
                }

                reportRow.insurances.push(insuranceRow);
            }

            report.push(reportRow);
        }

        res.json(report);
    } catch (error) {
        res.status(500).send("Chyba při generování reportu.");
    }
});

