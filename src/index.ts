import path = require("path");
import fs = require("fs");

import Promise = require("bluebird");

declare var vim;

import * as ts from "typescript";

import * as tshost from "./TypeScriptServerHost"
import * as omni from "./OmniCompleter"
import {SyntaxHighlighter} from "./SyntaxHighlighter"

var host = new tshost.TypeScriptServerHost();

var cachedContents = "";

vim.on("BufferChanged", (args) => {
    console.log("BufferChanged: " + JSON.stringify(args));
    var fileName = args.fileName;
    var newContents = args.newContents;
    cachedContents = newContents;

    host.updateFile(fileName, newContents);
    updateSyntaxHighlighting(fileName);
});

vim.omniCompleters.register("typescript", new omni.OmniCompleter(host));
vim.omniCompleters.register("javascript", new omni.OmniCompleter(host));

vim.on("BufEnter", (args) => {
    host.openFile(args.currentBuffer);
    updateSyntaxHighlighting(args.currentBuffer);
});

vim.on("CursorMoved", (args) => {
    showQuickInfo(args);
});

vim.on("CursorMovedI", (args) => {
    showQuickInfo(args);
});

function showQuickInfo(args) {

    host.getQuickInfo(args.currentBuffer, parseInt(args.line), parseInt(args.col)).then((val: any) => {
        console.log("Quick info: " + JSON.stringify(val));
        var outputString = val.displayString;
        outputString = outputString.split("\n").join(" ");
        vim.echo(outputString);
    });
}


vim.addCommand("TSSaveDebug", (args) => {
    host.saveTo(args.currentBuffer, "C:/test-file.txt");
});

vim.addCommand("TSSuperDerp", (args) => {
    host.updateFile(args.currentBuffer, "DERP");
});

vim.addCommand("TSSuperUpdate", (args) => {

    host.updateFile(args.currentBuffer, cachedContents);
});

vim.addCommand("TSDefinition", (args) => {
    host.getTypeDefinition(args.currentBuffer, parseInt(args.line), parseInt(args.col)).then((val: any) => {
        val = val[0];

        // TODO: Consider porting back to vim API
        vim.exec(":e! " + val.file);
        vim.exec(":keepjumps norm " + val.start.line + "G" + val.start.offset);
        vim.exec(":norm zz");
        vim.exec(":redraw");
    }, (err) => {
        vim.echo("Error: " + err);
    });
});

vim.addCommand("TSCompletions", (args) => {
    host.getCompletions(args.currentBuffer, parseInt(args.line), parseInt(args.col)).then((val: any) => {
        console.log("Completions: " + JSON.stringify(val));
        // vim.exec(":e " + val.file + " | :norm " + val.start.line + "G" + val.start.offset + "| | zz");
    }, (err) => {
        vim.echo("Error: " + err);
    });
});

vim.addCommand("TSCompletionDetails", (args) => {
    host.getCompletions(args.currentBuffer, parseInt(args.line), parseInt(args.col))
        .then((val: any) => {
            var names = val.map((v) => v.name);
            console.log("Names: " + JSON.stringify(names));

            host.getCompletionDetails(args.currentBuffer, parseInt(args.line), parseInt(args.col), names)
            .then((result => {
                console.log("Completoins with details: " + JSON.stringify(result));
            }))
        });
})

vim.addCommand("TSQuickInfo", (args) => {
    host.getQuickInfo(args.currentBuffer, parseInt(args.line), parseInt(args.col)).then((val: any) => {
        console.log("Quick info: " + JSON.stringify(val));
        vim.echo(val.displayString);
        // vim.exec(":e " + val.file + " | :norm " + val.start.line + "G" + val.start.offset + "| | zz");
    }, (err) => {
        vim.echo("Error: " + err);
    });
});

vim.addCommand("TSSignatureHelp", (args) => {
    host.getSignatureHelp(args.currentBuffer, parseInt(args.line), parseInt(args.col)).then((val: any) => {
        console.log("Signature help" + JSON.stringify(val));
        // vim.exec(":e " + val.file + " | :norm " + val.start.line + "G" + val.start.offset + "| | zz");
    }, (err) => {
        vim.echo("Error: " + err);
    });
});

vim.addCommand("TSErrors", (args) => {
    host.getErrors(args.currentBuffer).then((val: any) => {
        // vim.exec(":e " + val.file + " | :norm " + val.start.line + "G" + val.start.offset + "| | zz");
    }, (err) => {
        vim.echo("Error: " + err);
    });
});

vim.addCommand("TSDerp", (args) => {
    host.getSignatureHelp(args.currentBuffer, parseInt(args.line), parseInt(args.col)).then((val: any) => {
        // vim.exec(":e " + val.file + " | :norm " + val.start.line + "G" + val.start.offset + "| | zz");
    }, (err) => {
        vim.echo("Error: " + err);
    });
});

vim.addCommand("TSNavigationBarItems", (args) => {
    host._makeTssRequest<void>("navbar", {
        file: args.currentBuffer
    }).then((val: any) => {
        console.log(JSON.stringify(val));
        console.log(JSON.stringify(val));
    }, (err) => {
        console.log("Error:" + err);
    });
});

vim.addCommand("TSSyntaxHighlight", (args) => {
    console.log("Syntax highlight");

    updateSyntaxHighlighting(args.currentBuffer);
});

function updateSyntaxHighlighting(file) {

    host._makeTssRequest<void>("navbar", {
        file: file
    }).then((val: any) => {

        console.log("Got highlighting result: " + JSON.stringify(val));

        var syntaxHighlighter = new SyntaxHighlighter();
        var highlighting = syntaxHighlighter.getSyntaxHighlighting(val);

        vim.setSyntaxHighlighting(highlighting);
        console.log("Setting syntax highlighting: " + JSON.stringify(highlighting));
    }, (err) => {
        console.error(err);
    });
}

vim.addCommand("TSProcessID", (args) => {
    vim.echo(host.pid);
});

vim.addCommand("TSGetHostProcessID", (args) => {
    vim.echo(process.pid);
});

// vim.addCommand("TSGetCompletions", (args) => {
//     console.log("TSGETCOMPLETIONS!");

//     var project = tspm.getProjectFromFile(args.currentBuffer);

//     var completions = project.getCompletions(args.currentBuffer, null, args.byte);
//     if(completions)
//         console.log("Completion count: " + completions.length);
//     else
//         console.log("No completions");
// });
