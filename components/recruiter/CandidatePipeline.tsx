"use client";

import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const pipelineStatuses = ['applied', 'screening', 'interview', 'offer', 'hired'];

export const CandidatePipeline = ({ applicants: initialApplicants, jobId }: { applicants: any[], jobId: string }) => {
  const [applicants, setApplicants] = useState(initialApplicants);

  const onDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result;

    if (!destination) {
      return;
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newApplicants = Array.from(applicants);
    const movedApplicant = newApplicants.find(app => app.id.toString() === draggableId);

    if (movedApplicant) {
      movedApplicant.status = destination.droppableId;
      setApplicants(newApplicants);

      // API call to update status
      await fetch('/api/recruiter/jobs/applicants/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: draggableId, status: destination.droppableId }),
      });
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {pipelineStatuses.map((status) => (
          <Droppable key={status} droppableId={status}>
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="bg-muted/50 rounded-lg p-4"
              >
                <h2 className="font-bold mb-4 capitalize">{status}</h2>
                {applicants
                  .filter((app) => app.status === status)
                  .map((applicant, index) => (
                    <Draggable key={applicant.id} draggableId={applicant.id.toString()} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="mb-4"
                        >
                          <Card>
                            <CardContent className="p-4 flex items-center gap-4">
                              <Avatar>
                                <AvatarImage src={applicant.candidate.avatar_url} />
                                <AvatarFallback>{applicant.candidate.full_name?.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-semibold">{applicant.candidate.full_name}</p>
                                <p className="text-sm text-muted-foreground">{applicant.candidate.headline}</p>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      )}
                    </Draggable>
                  ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  );
};
