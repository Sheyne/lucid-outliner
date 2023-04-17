import {EditorClient, Modal} from 'lucid-extension-sdk';
import importHtml from '../resources/import.html';

export interface ImportModalMessage {
    'name': string;
    'content': string;
}

export class ImportModal extends Modal {
    constructor(client: EditorClient) {
        super(client, {
            title: 'Import a thing',
            width: 600,
            height: 400,
            content: importHtml,
        });
    }

    protected frameLoaded() {
        this.sendMessage({'message': 'Successfully passed message to iframe'});
    }

    protected messageFromFrame(message: ImportModalMessage): void {
        console.log(message['name']);
        console.log(message['content']);

        this.hide();
    }
}
