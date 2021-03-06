import React, { useState } from "react";
import styled from "styled-components";
import moment, { Moment } from "moment";
import LogObject from "../../../models/logObject";
import LogObjectService from "../../../services/logObjectService";
import { truncateAbortHandler } from "../../../services/apiClient";
import ModalDialog from "../ModalDialog";
import { WITSML_INDEX_TYPE_DATE_TIME, WITSML_INDEX_TYPE_MD } from "../../Constants";
import { createTrimLogObjectJob } from "../../../models/jobs/trimLogObjectJob";
import JobService, { JobType } from "../../../services/jobService";
import { colors } from "../../../styles/Colors";
import AdjustNumberRangeModal from "./AdjustNumberRangeModal";
import AdjustDateTimeModal from "./AdjustDateTimeModal";
import OperationType from "../../../contexts/operationType";
import ModificationType from "../../../contexts/modificationType";
import { UpdateWellboreLogsAction } from "../../../contexts/navigationStateReducer";
import { HideModalAction } from "../../../contexts/operationStateReducer";

export interface TrimLogObjectModalProps {
  dispatchNavigation: (action: UpdateWellboreLogsAction) => void;
  dispatchOperation: (action: HideModalAction) => void;
  logObject: LogObject;
}

const TrimLogObjectModal = (props: TrimLogObjectModalProps): React.ReactElement => {
  const { dispatchNavigation, dispatchOperation, logObject } = props;
  const [log] = useState<LogObject>(logObject);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [startIndex, setStartIndex] = useState<Moment | number>();
  const [endIndex, setEndIndex] = useState<Moment | number>();
  const [confirmDisabled, setConfirmDisabled] = useState<boolean>();

  const onSubmit = async (updatedLog: LogObject) => {
    setIsLoading(true);
    const trimLogObjectJob = createTrimLogObjectJob(log, startIndex, endIndex);
    await JobService.orderJob(JobType.TrimLogObject, trimLogObjectJob);
    refreshWellboreLogs(updatedLog);
  };

  const refreshWellboreLogs = (log: LogObject) => {
    const controller = new AbortController();

    async function getLogObject() {
      const freshLogs = await LogObjectService.getLogs(log.wellUid, log.wellboreUid, controller.signal);
      dispatchNavigation({ type: ModificationType.UpdateLogObjects, payload: { wellUid: log.wellUid, wellboreUid: log.wellboreUid, logs: freshLogs } });
      setIsLoading(false);
      dispatchOperation({ type: OperationType.HideModal });
    }

    getLogObject().catch(truncateAbortHandler);

    return () => controller.abort();
  };

  const toggleConfirmDisabled = (isValid: boolean) => {
    setConfirmDisabled(!isValid);
  };

  return (
    <>
      {log && (
        <ModalDialog
          heading={`Adjust start/end index for ${log.name}`}
          content={
            <>
              {log.indexType === WITSML_INDEX_TYPE_DATE_TIME && (
                <AdjustDateTimeModal
                  minDate={moment(log.startIndex)}
                  maxDate={moment(log.endIndex)}
                  onStartDateChanged={setStartIndex}
                  onEndDateChanged={setEndIndex}
                  onValidChange={toggleConfirmDisabled}
                />
              )}
              {log.indexType === WITSML_INDEX_TYPE_MD && (
                <AdjustNumberRangeModal
                  minValue={indexToNumber(logObject.startIndex)}
                  maxValue={indexToNumber(logObject.endIndex)}
                  onStartValueChanged={setStartIndex}
                  onEndValueChanged={setEndIndex}
                  onValidChange={toggleConfirmDisabled}
                />
              )}
              <Warning>
                <strong>Warning:</strong> Adjusting start/end index will permanently remove data values outside selected range
              </Warning>
            </>
          }
          onSubmit={() => onSubmit(log)}
          isLoading={isLoading}
          confirmColor={"secondary"}
          confirmText={"Adjust"}
          confirmDisabled={confirmDisabled}
          switchButtonPlaces
        />
      )}
    </>
  );
};

const indexToNumber = (index: string): number => {
  return Number(index.replace(/[^\d.-]/g, ""));
};

export interface TrimProps {
  logObject: LogObject;
  onStartIndexChanged: (value: Moment | string) => void;
  onEndIndexChanged: (value: Moment | string) => void;
  onValidChange: (isValid: boolean) => void;
}

const Warning = styled.div`
  border: 1px solid ${colors.interactive.dangerResting};
  border-radius: 2px;
  padding: 1em;
  background-color: ${colors.interactive.dangerHighlight};
  color: ${colors.interactive.dangerHover};
  margin-top: 1em;
  width: 28em;
`;

export default TrimLogObjectModal;
