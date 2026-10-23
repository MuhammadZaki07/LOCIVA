<?php

namespace App\Events;

use App\Models\Report;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ReportCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $afterCommit = true;

    public function __construct(
        public Report $report
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('admin.reports'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'report.created';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->report->id,
            'title' => $this->report->title,
            'status' => $this->report->status,
            'created_at' => $this->report->created_at?->toISOString(),
        ];
    }
}
