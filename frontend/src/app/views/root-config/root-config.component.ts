import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../services/auth.service';
import { forkJoin } from 'rxjs';
import { ProfileService } from 'src/app/services/profile.service';
import { SchemaService } from 'src/app/services/schema.service';
import { IUser, Schema, SchemaEntity, SchemaHelper } from '@guardian/interfaces';
import { DemoService } from 'src/app/services/demo.service';
import { VCViewerDialog } from 'src/app/schema-engine/vc-dialog/vc-dialog.component';
import { HeaderPropsService } from 'src/app/services/header-props.service';
import { InformService } from 'src/app/services/inform.service';
import { TasksService } from 'src/app/services/tasks.service';

enum OperationMode {
    None, Generate, SetProfile
}

/**
 * Standard Registry profile settings page.
 */
@Component({
    selector: 'app-root-config',
    templateUrl: './root-config.component.html',
    styleUrls: ['./root-config.component.css']
})
export class RootConfigComponent implements OnInit {
    isConfirmed: boolean = false;
    isFailed: boolean = false;
    isNewAccount: boolean = true;
    errorLoadSchema: boolean = false;
    loading: boolean = true;
    progress: number = 0;

    hederaForm = this.fb.group({
        hederaAccountId: ['', Validators.required],
        hederaAccountKey: ['', Validators.required],
    });
    profile: IUser | null;
    balance: string | null;
    progressInterval: any;

    vcForm: FormGroup;
    hideVC: any;
    formValid: boolean = false;
    schema!: Schema;

    operationMode: OperationMode = OperationMode.None;
    taskId: string | undefined = undefined;
    expectedTaskMessages: number = 0;

    constructor(
        private auth: AuthService,
        private profileService: ProfileService,
        private schemaService: SchemaService,
        private otherService: DemoService,
        private informService: InformService,
        private taskService: TasksService,
        private fb: FormBuilder,
        public dialog: MatDialog,
        private headerProps: HeaderPropsService) {

        this.profile = null;
        this.balance = null;
        this.vcForm = new FormGroup({});
        this.hederaForm.addControl('vc', this.vcForm);
        this.hideVC = {
            id: true
        }
        this.hederaForm.statusChanges.subscribe(
            (result) => {
                setTimeout(() => {
                    this.formValid = result == 'VALID';
                });
            }
        );
    }

    ngOnInit() {
        this.loading = true;
        this.hederaForm.setValue({
            hederaAccountId: '',
            hederaAccountKey: '',
            vc: {}
        });
        this.loadProfile();
    }

    loadProfile() {
        this.loading = true;
        this.profile = null;
        this.balance = null;

        forkJoin([
            this.profileService.getProfile(),
            this.profileService.getBalance(),
            this.schemaService.getSystemSchemasByEntity(SchemaEntity.STANDARD_REGISTRY)
        ]).subscribe((value) => {
            if(!value[2]) {
                this.errorLoadSchema = true;
                this.loading = false;
                this.headerProps.setLoading(false);
                return;
            }

            const profile = value[0];
            const balance = value[1];
            const schema = value[2];

            this.isConfirmed = !!(profile.confirmed);
            this.isFailed = !!(profile.failed);
            this.isNewAccount = !!(!profile.didDocument);

            if (this.isConfirmed) {
                this.balance = balance;
                this.profile = profile;
            }

            if(schema) {
                this.schema = new Schema(schema);
            }

            setTimeout(() => {
                this.loading = false;
                this.headerProps.setLoading(false);
            }, 500)
        }, (error) => {
            this.loading = false;
            this.headerProps.setLoading(false);
            console.error(error);
        });
    }

    onHederaSubmit() {
        if (this.hederaForm.valid) {
            const value = this.hederaForm.value;
            const vcDocument = value.vc;
            this.prepareDataFrom(vcDocument);
            const data: any = {
                hederaAccountId: value.hederaAccountId,
                hederaAccountKey: value.hederaAccountKey,
                vcDocument: vcDocument
            }
            this.loading = true;
            this.headerProps.setLoading(true);
            this.profileService.pushSetProfile(data).subscribe((result) => {
                const { taskId, expectation } = result;
                this.taskId = taskId;
                this.expectedTaskMessages = expectation;
                this.operationMode = OperationMode.SetProfile;
            }, (error) => {
                this.loading = false;
                this.headerProps.setLoading(false);
                console.error(error);
            });
        }
    }

    openVCDocument(document: any, title: string) {
        const dialogRef = this.dialog.open(VCViewerDialog, {
            width: '850px',
            data: {
                document: document.document,
                title: title,
                type: 'VC',
                viewDocument: true
            }
        });
        dialogRef.afterClosed().subscribe(async (result) => {
        });
    }

    openDIDDocument(document: any, title: string) {
        const dialogRef = this.dialog.open(VCViewerDialog, {
            width: '850px',
            data: {
                document: document.document,
                title: title,
                type: 'JSON',
            }
        });

        dialogRef.afterClosed().subscribe(async (result) => {
        });
    }

    setProgress(value: boolean) {
        this.progress = 0;
        clearInterval(this.progressInterval);
        if (value) {
            this.progress++;
            this.progressInterval = setInterval(() => {
                this.progress = Math.min(++this.progress, 100);
            }, 600);
        }
    }

    ngOnDestroy(): void {
        clearInterval(this.progressInterval)
    }

    randomKey() {
        this.loading = true;
        this.otherService.pushGetRandomKey().subscribe((result) => {
            const { taskId, expectation } = result;
            this.taskId = taskId;
            this.expectedTaskMessages = expectation;
            this.operationMode = OperationMode.Generate;
        }, (e) => {
            this.loading = false;
            this.taskId = undefined;
        });
    }

    onChangeForm() {
        this.vcForm.updateValueAndValidity();
    }

    retry() {
        this.isConfirmed = false;
        this.isFailed = false;
        this.isNewAccount = true;
        clearInterval(this.progressInterval);
    }

    prepareDataFrom(data: any) {
        if(Array.isArray(data)) {
            for (let j = 0; j < data.length; j++) {
                let dataArrayElem = data[j];
                if(dataArrayElem === "" || dataArrayElem === null) {
                    data.splice(j, 1);
                    j--;
                }
                if(Object.getPrototypeOf(dataArrayElem) === Object.prototype
                    || Array.isArray(dataArrayElem)) {
                    this.prepareDataFrom(dataArrayElem);
                }
            }
        }

        if (Object.getPrototypeOf(data) === Object.prototype)
        {
            let dataKeys = Object.keys(data);
            for (let i = 0;i< dataKeys.length; i++) {
                const dataElem = data[dataKeys[i]];
                if(dataElem === "" || dataElem === null) {
                    delete data[dataKeys[i]];
                }
                if(Object.getPrototypeOf(dataElem) === Object.prototype
                    || Array.isArray(dataElem)) {
                    this.prepareDataFrom(dataElem);
                }
            }
        }
    }

    onAsyncError(error: any) {
        this.informService.processAsyncError(error);
        this.loading = false;
        this.taskId = undefined;
    }

    onAsyncCompleted() {
        if (this.taskId) {
            const taskId = this.taskId;
            const operationMode = this.operationMode;
            this.taskId = undefined;
            this.operationMode = OperationMode.None;
            this.taskService.get(taskId).subscribe((task) => {
                switch (operationMode) {
                    case OperationMode.Generate: {
                        const { id, key} = task.result;
                        const value = this.hederaForm.value;
                        this.hederaForm.setValue({
                                hederaAccountId: id,
                                hederaAccountKey: key,
                                vc: value.vc
                            });
                        this.loading = false;
                        break;
                    }
                    case OperationMode.SetProfile: {
                        this.loadProfile();
                        break;
                    }
                }
            }, (e) => {
                this.loading = false;
            });
        }
    }
}
