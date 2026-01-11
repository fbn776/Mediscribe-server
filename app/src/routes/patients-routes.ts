import {Router} from "express";
import {setAccessControl} from "../utils/utils";
import PatientController from "../controllers/patient-controller";

const PatientsRoutes = Router();

PatientsRoutes.get('/patients', setAccessControl('1,2'), PatientController.getAll);
PatientsRoutes.get('/patients/:id', setAccessControl('1,2,3'), PatientController.getById);
PatientsRoutes.post('/patients', setAccessControl('1,2'), PatientController.createOne);
PatientsRoutes.put('/patients/:id', setAccessControl('1,2'), PatientController.updateOne);
PatientsRoutes.delete('/patients/:id', setAccessControl('1,2'), PatientController.deleteOne);

export default PatientsRoutes;