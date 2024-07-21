"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var anchor = require("@coral-xyz/anchor");
var web3_js_1 = require("@solana/web3.js");
var fs = require("fs");
var path = require("path");
// Path to the keypair file
var keypairPath = path.resolve(require('os').homedir(), '.config', 'solana', 'id.json');
// Load the keypair from the file
var secretKey = new Uint8Array(JSON.parse(fs.readFileSync(keypairPath, 'utf8')));
var wallet = web3_js_1.Keypair.fromSecretKey(secretKey);
console.log("Wallet public key:", wallet.publicKey.toBase58());
// Setup provider with custom RPC URL
var customRpcUrl = 'http://xolana.xen.network:8899/';
var connection = new web3_js_1.Connection(customRpcUrl, 'confirmed');
var provider = new anchor.AnchorProvider(connection, new anchor.Wallet(wallet), anchor.AnchorProvider.defaultOptions());
anchor.setProvider(provider);
console.log("Provider set with custom RPC URL");
// New program ID
var programId = new web3_js_1.PublicKey('CPEruFKwEu5897J7QeYzjxjkS5UR2eRZgEDchWmZ9v6s');
console.log("Program ID:", programId.toBase58());
// Load the IDL from the file system
var idlPath = path.resolve(__dirname, './target/idl/prime_slot_checker.json');
var idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));
console.log("IDL loaded");
var main = function () { return __awaiter(void 0, void 0, void 0, function () {
    var program, _a, jackpotPda, jackpotBump, err_1, txInitJackpot, initJackpotErr_1, _b, userPda, userBump, err_2, txInitUser, initUserErr_1, tx, userAccountData, jackpotAccountData, err_3;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 26, , 27]);
                program = new anchor.Program(idl, provider);
                console.log("Program initialized");
                return [4 /*yield*/, web3_js_1.PublicKey.findProgramAddress([Buffer.from("jackpot")], programId)];
            case 1:
                _a = _c.sent(), jackpotPda = _a[0], jackpotBump = _a[1];
                console.log("Jackpot PDA:", jackpotPda.toBase58());
                console.log("Jackpot bump seed:", jackpotBump);
                _c.label = 2;
            case 2:
                _c.trys.push([2, 4, , 11]);
                return [4 /*yield*/, program.account.jackpot.fetch(jackpotPda)];
            case 3:
                _c.sent();
                console.log("Jackpot account already exists.");
                return [3 /*break*/, 11];
            case 4:
                err_1 = _c.sent();
                if (!err_1.message.includes("Account does not exist")) return [3 /*break*/, 9];
                console.log("Jackpot account does not exist. Initializing...");
                _c.label = 5;
            case 5:
                _c.trys.push([5, 7, , 8]);
                return [4 /*yield*/, program.methods
                        .initialize(jackpotBump)
                        .accounts({
                        jackpot: jackpotPda,
                        payer: wallet.publicKey,
                        systemProgram: web3_js_1.SystemProgram.programId
                    })
                        .signers([wallet])
                        .rpc()];
            case 6:
                txInitJackpot = _c.sent();
                console.log("Jackpot initialization transaction signature:", txInitJackpot);
                return [3 /*break*/, 8];
            case 7:
                initJackpotErr_1 = _c.sent();
                console.error("Error initializing jackpot account:", initJackpotErr_1);
                return [2 /*return*/];
            case 8: return [3 /*break*/, 10];
            case 9:
                console.error("Error checking jackpot account:", err_1);
                return [2 /*return*/];
            case 10: return [3 /*break*/, 11];
            case 11: return [4 /*yield*/, web3_js_1.PublicKey.findProgramAddress([Buffer.from("user"), wallet.publicKey.toBuffer()], programId)];
            case 12:
                _b = _c.sent(), userPda = _b[0], userBump = _b[1];
                console.log("User PDA:", userPda.toBase58());
                console.log("User bump seed:", userBump);
                _c.label = 13;
            case 13:
                _c.trys.push([13, 15, , 22]);
                return [4 /*yield*/, program.account.user.fetch(userPda)];
            case 14:
                _c.sent();
                console.log("User account already exists.");
                return [3 /*break*/, 22];
            case 15:
                err_2 = _c.sent();
                if (!err_2.message.includes("Account does not exist")) return [3 /*break*/, 20];
                console.log("User account does not exist. Initializing...");
                _c.label = 16;
            case 16:
                _c.trys.push([16, 18, , 19]);
                return [4 /*yield*/, program.methods
                        .initializeUser(userBump)
                        .accounts({
                        user: userPda,
                        payer: wallet.publicKey,
                        systemProgram: web3_js_1.SystemProgram.programId
                    })
                        .signers([wallet])
                        .rpc()];
            case 17:
                txInitUser = _c.sent();
                console.log("User initialization transaction signature:", txInitUser);
                return [3 /*break*/, 19];
            case 18:
                initUserErr_1 = _c.sent();
                console.error("Error initializing user account:", initUserErr_1);
                return [2 /*return*/];
            case 19: return [3 /*break*/, 21];
            case 20:
                console.error("Error checking user account:", err_2);
                return [2 /*return*/];
            case 21: return [3 /*break*/, 22];
            case 22: return [4 /*yield*/, program.methods
                    .checkSlot(userBump)
                    .accounts({
                    user: userPda,
                    jackpot: jackpotPda,
                    payer: wallet.publicKey
                })
                    .signers([wallet])
                    .rpc()];
            case 23:
                tx = _c.sent();
                console.log("Transaction signature", tx);
                return [4 /*yield*/, program.account.user.fetch(userPda)];
            case 24:
                userAccountData = _c.sent();
                console.log('User points after checking the current slot:', userAccountData.points.toString());
                return [4 /*yield*/, program.account.jackpot.fetch(jackpotPda)];
            case 25:
                jackpotAccountData = _c.sent();
                console.log('Jackpot pool amount:', jackpotAccountData.amount.toString());
                return [3 /*break*/, 27];
            case 26:
                err_3 = _c.sent();
                console.error("Error:", err_3);
                return [3 /*break*/, 27];
            case 27: return [2 /*return*/];
        }
    });
}); };
main()["catch"](function (err) {
    console.error("Main function error:", err);
});
